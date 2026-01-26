/**
 * Photo Editor Module - Image cropping and border addition
 */
const PhotoEditorModule = {
  id: 'photoeditor',
  title: 'Photo Editor',
  category: 'productivity',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  defaultSize: { width: 800, height: 550 },
  minSize: { width: 600, height: 400 },

  container: null,
  storage: null,
  cropper: null,
  imageEl: null,
  originalImageData: null,

  // Settings with defaults
  borderWidth: 0,
  borderColor: '#ffffff',
  outputFormat: 'png',
  aspectRatio: NaN,

  async init(container, storage) {
    this.container = container;
    this.storage = storage;

    // Restore settings
    this.borderWidth = storage.get('borderWidth', 0);
    this.borderColor = storage.get('borderColor', '#ffffff');
    this.outputFormat = storage.get('outputFormat', 'png');

    await this._loadCropper();
    this._buildUI();
    this._bindEvents();
  },

  async _loadCropper() {
    if (window.Cropper) return;

    // Load Cropper.js CSS
    if (!document.querySelector('link[href*="cropperjs"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://esm.sh/cropperjs@1.6/dist/cropper.min.css';
      document.head.appendChild(link);
    }

    // Load Cropper.js
    const module = await import('https://esm.sh/cropperjs@1.6');
    window.Cropper = module.default;
  },

  _buildUI() {
    this.container.innerHTML = `
      <div class="photoeditor-container">
        <div class="photoeditor-toolbar">
          <button class="photoeditor-btn photoeditor-new-btn">New Image</button>
          <div class="photoeditor-toolbar-spacer"></div>
          <button class="photoeditor-btn photoeditor-download-btn" disabled>Download</button>
        </div>

        <div class="photoeditor-main">
          <div class="photoeditor-upload-area">
            <div class="photoeditor-dropzone">
              <svg class="photoeditor-dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <p class="photoeditor-dropzone-text">Drop an image here</p>
              <p class="photoeditor-dropzone-subtext">or click to browse</p>
              <input type="file" class="photoeditor-file-input" accept="image/*">
            </div>
          </div>

          <div class="photoeditor-editor-area photoeditor-hidden">
            <div class="photoeditor-canvas-wrapper">
              <img class="photoeditor-image" alt="Image to edit">
            </div>

            <div class="photoeditor-sidebar">
              <div class="photoeditor-section">
                <div class="photoeditor-section-title">Crop</div>
                <div class="photoeditor-aspect-buttons">
                  <button class="photoeditor-aspect-btn active" data-aspect="free">Free</button>
                  <button class="photoeditor-aspect-btn" data-aspect="1:1">1:1</button>
                  <button class="photoeditor-aspect-btn" data-aspect="4:3">4:3</button>
                  <button class="photoeditor-aspect-btn" data-aspect="16:9">16:9</button>
                </div>
                <button class="photoeditor-btn photoeditor-apply-crop-btn">Apply Crop</button>
              </div>

              <div class="photoeditor-section">
                <div class="photoeditor-section-title">Border</div>
                <div class="photoeditor-control">
                  <label>Width</label>
                  <div class="photoeditor-slider-row">
                    <input type="range" class="photoeditor-border-slider" min="0" max="100" value="${this.borderWidth}">
                    <span class="photoeditor-border-value">${this.borderWidth}px</span>
                  </div>
                </div>
                <div class="photoeditor-control">
                  <label>Color</label>
                  <input type="color" class="photoeditor-border-color" value="${this.borderColor}">
                </div>
                <div class="photoeditor-preview-box">
                  <canvas class="photoeditor-preview-canvas"></canvas>
                </div>
              </div>

              <div class="photoeditor-section">
                <div class="photoeditor-section-title">Output</div>
                <div class="photoeditor-control">
                  <label>Format</label>
                  <select class="photoeditor-format-select">
                    <option value="png" ${this.outputFormat === 'png' ? 'selected' : ''}>PNG</option>
                    <option value="jpeg" ${this.outputFormat === 'jpeg' ? 'selected' : ''}>JPEG</option>
                    <option value="webp" ${this.outputFormat === 'webp' ? 'selected' : ''}>WebP</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.imageEl = this.container.querySelector('.photoeditor-image');
  },

  _bindEvents() {
    const fileInput = this.container.querySelector('.photoeditor-file-input');
    const dropzone = this.container.querySelector('.photoeditor-dropzone');
    const newBtn = this.container.querySelector('.photoeditor-new-btn');
    const downloadBtn = this.container.querySelector('.photoeditor-download-btn');
    const applyCropBtn = this.container.querySelector('.photoeditor-apply-crop-btn');
    const borderSlider = this.container.querySelector('.photoeditor-border-slider');
    const borderColor = this.container.querySelector('.photoeditor-border-color');
    const formatSelect = this.container.querySelector('.photoeditor-format-select');

    // File input change
    fileInput.addEventListener('change', (e) => {
      if (e.target.files?.[0]) {
        this._handleUpload(e.target.files[0]);
      }
    });

    // Click dropzone to open file picker
    dropzone.addEventListener('click', () => fileInput.click());

    // Drag and drop
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('photoeditor-dropzone-active');
    });

    dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzone.classList.remove('photoeditor-dropzone-active');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('photoeditor-dropzone-active');
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
        this._handleUpload(file);
      }
    });

    // New image button
    newBtn.addEventListener('click', () => this._reset());

    // Download button
    downloadBtn.addEventListener('click', () => this._exportImage());

    // Apply crop
    applyCropBtn.addEventListener('click', () => this._applyCrop());

    // Aspect ratio buttons
    this.container.querySelectorAll('.photoeditor-aspect-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.container.querySelectorAll('.photoeditor-aspect-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const aspect = e.target.dataset.aspect;
        if (aspect === 'free') {
          this.aspectRatio = NaN;
        } else {
          const [w, h] = aspect.split(':').map(Number);
          this.aspectRatio = w / h;
        }

        if (this.cropper) {
          this.cropper.setAspectRatio(this.aspectRatio);
        }
      });
    });

    // Border slider
    borderSlider.addEventListener('input', (e) => {
      this.borderWidth = parseInt(e.target.value, 10);
      this.container.querySelector('.photoeditor-border-value').textContent = `${this.borderWidth}px`;
      this.storage.set('borderWidth', this.borderWidth);
      this._updateBorderPreview();
    });

    // Border color
    borderColor.addEventListener('input', (e) => {
      this.borderColor = e.target.value;
      this.storage.set('borderColor', this.borderColor);
      this._updateBorderPreview();
    });

    // Output format
    formatSelect.addEventListener('change', (e) => {
      this.outputFormat = e.target.value;
      this.storage.set('outputFormat', this.outputFormat);
    });
  },

  _handleUpload(file) {
    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.originalImageData = e.target.result;
      this.imageEl.src = this.originalImageData;
      this.imageEl.onload = () => {
        this._showEditor();
        this._initCropper();
      };
    };
    reader.readAsDataURL(file);
  },

  _initCropper() {
    if (this.cropper) {
      this.cropper.destroy();
    }

    this.cropper = new window.Cropper(this.imageEl, {
      viewMode: 1,
      dragMode: 'move',
      aspectRatio: this.aspectRatio,
      autoCropArea: 1,
      restore: false,
      guides: true,
      center: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      background: true,
      ready: () => {
        this._updateBorderPreview();
      },
      crop: () => {
        this._debouncedPreviewUpdate();
      }
    });
  },

  _debouncedPreviewUpdate() {
    if (this._previewTimeout) {
      clearTimeout(this._previewTimeout);
    }
    this._previewTimeout = setTimeout(() => {
      this._updateBorderPreview();
    }, 100);
  },

  _applyCrop() {
    if (!this.cropper) return;

    const croppedCanvas = this.cropper.getCroppedCanvas();
    if (!croppedCanvas) return;

    // Update the image with cropped result
    const croppedData = croppedCanvas.toDataURL('image/png');
    this.originalImageData = croppedData;

    // Reset the cropper with new image
    this.cropper.destroy();
    this.imageEl.src = croppedData;
    this.imageEl.onload = () => {
      this._initCropper();
    };
  },

  _addBorder(canvas) {
    if (this.borderWidth === 0) {
      return canvas;
    }

    const borderCanvas = document.createElement('canvas');
    const bw = this.borderWidth;
    borderCanvas.width = canvas.width + (bw * 2);
    borderCanvas.height = canvas.height + (bw * 2);

    const ctx = borderCanvas.getContext('2d');

    // Fill with border color
    ctx.fillStyle = this.borderColor;
    ctx.fillRect(0, 0, borderCanvas.width, borderCanvas.height);

    // Draw original image in center
    ctx.drawImage(canvas, bw, bw);

    return borderCanvas;
  },

  _exportImage() {
    if (!this.cropper) return;

    // Get cropped canvas
    const croppedCanvas = this.cropper.getCroppedCanvas();
    if (!croppedCanvas) return;

    // Add border
    const finalCanvas = this._addBorder(croppedCanvas);

    // Determine MIME type and extension
    const mimeTypes = {
      png: 'image/png',
      jpeg: 'image/jpeg',
      webp: 'image/webp'
    };
    const mimeType = mimeTypes[this.outputFormat] || 'image/png';
    const quality = this.outputFormat === 'jpeg' ? 0.92 : undefined;

    // Convert to blob and download
    finalCanvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image.${this.outputFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, mimeType, quality);
  },

  _updateBorderPreview() {
    if (!this.cropper) return;

    const canvas = this.container.querySelector('.photoeditor-preview-canvas');
    if (!canvas) return;

    // Get cropped canvas at full size to know actual dimensions
    const fullCanvas = this.cropper.getCroppedCanvas();
    if (!fullCanvas) return;

    // Calculate scale factor to fit preview (max 150px)
    const maxPreviewSize = 150;
    const scale = Math.min(maxPreviewSize / fullCanvas.width, maxPreviewSize / fullCanvas.height, 1);

    // Scale both image and border proportionally
    const scaledWidth = Math.round(fullCanvas.width * scale);
    const scaledHeight = Math.round(fullCanvas.height * scale);
    const scaledBorder = Math.max(1, Math.round(this.borderWidth * scale));

    const previewWidth = scaledWidth + (scaledBorder * 2);
    const previewHeight = scaledHeight + (scaledBorder * 2);

    canvas.width = previewWidth;
    canvas.height = previewHeight;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = this.borderColor;
    ctx.fillRect(0, 0, previewWidth, previewHeight);
    ctx.drawImage(fullCanvas, 0, 0, fullCanvas.width, fullCanvas.height,
                  scaledBorder, scaledBorder, scaledWidth, scaledHeight);
  },

  _showEditor() {
    this.container.querySelector('.photoeditor-upload-area').classList.add('photoeditor-hidden');
    this.container.querySelector('.photoeditor-editor-area').classList.remove('photoeditor-hidden');
    this.container.querySelector('.photoeditor-download-btn').disabled = false;
    this._updateBorderPreview();
  },

  _showUpload() {
    this.container.querySelector('.photoeditor-upload-area').classList.remove('photoeditor-hidden');
    this.container.querySelector('.photoeditor-editor-area').classList.add('photoeditor-hidden');
    this.container.querySelector('.photoeditor-download-btn').disabled = true;
  },

  _reset() {
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = null;
    }

    this.originalImageData = null;
    this.imageEl.src = '';
    this.aspectRatio = NaN;

    // Reset aspect ratio buttons
    this.container.querySelectorAll('.photoeditor-aspect-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.aspect === 'free');
    });

    // Reset file input
    this.container.querySelector('.photoeditor-file-input').value = '';

    this._showUpload();
  },

  render() {},

  destroy() {
    if (this._previewTimeout) {
      clearTimeout(this._previewTimeout);
    }
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = null;
    }
  }
};

export default PhotoEditorModule;
