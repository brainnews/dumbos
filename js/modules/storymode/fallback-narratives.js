/**
 * Fallback narratives for Story Mode when Claude API is unavailable
 */
export const FALLBACK_NARRATIVES = [
  {
    character: {
      name: 'Maren',
      occupation: 'Sound designer',
      obsession: 'A frequency pattern she found in white noise that seemed to respond to her',
      fate: 'She stopped coming to work one Tuesday and her apartment was found empty with every speaker turned on.'
    },
    notes: [
      {
        title: 'New project setup',
        content: 'Starting the sound library project today. Client wants ambient textures for a meditation app. Should be straightforward. Set up the workspace and downloaded some field recordings to work with.',
        dayOffset: -30
      },
      {
        title: 'Interesting artifact',
        content: 'Found something strange while processing a rain recording. There\'s a pattern buried in the noise floor around 18.7kHz. Almost sounds deliberate. Probably just aliasing from the cheap mic but I\'m curious.',
        dayOffset: -18
      },
      {
        title: 'The pattern responds',
        content: 'This is going to sound insane. When I play the 18.7kHz tone through the speakers and record, the response isn\'t just echo. The frequency shifts. Slightly. Like something is modulating it. I\'ve checked the equipment three times.',
        dayOffset: -9
      },
      {
        title: 'It knows when I\'m listening',
        content: 'The modulation only happens when the recording is being monitored in real-time. I set up automated recording overnight - flat signal. The moment I put on headphones this morning, it started again. Amplitude is increasing.',
        dayOffset: -4
      },
      {
        title: 'Can\'t stop',
        content: 'I need to document this but I can\'t stop listening. The pattern has developed harmonics. They sound almost like words if I slow them down enough. I\'ve been at this for 19 hours. I should eat something. After one more recording.',
        dayOffset: -1
      }
    ],
    documents: [
      {
        title: 'Research Notes: Anomalous Frequency Response',
        content: '# Anomalous Frequency Response in Environmental Recordings\n\n## Abstract\n\nDuring routine processing of field recordings for a commercial project, an anomalous frequency pattern was discovered in the noise floor of multiple recordings captured at different locations and times. The pattern exhibits characteristics inconsistent with known sources of audio artifacts.\n\n## Methodology\n\nRecordings were captured using a matched pair of Sennheiser MKH 8040 microphones into a Sound Devices MixPre-6 at 96kHz/24bit. Processing was performed in Pro Tools with iZotope RX.\n\n## Initial Discovery\n\nThe pattern was first noticed during spectral analysis of a rain recording (Session 47, Central Park, 2024-01-15). A consistent energy band was observed at 18.73kHz with an unusual amplitude envelope that did not correlate with any environmental sound source.\n\n## Reproduction Attempts\n\nThe pattern has been identified in 23 of 31 recordings from the past three months. Notably:\n\n- Present in recordings from five different locations\n- Present regardless of microphone type or recording device\n- Not present in test tones or generated signals\n- Only present in recordings that capture ambient environmental sound\n\n## The Response Phenomenon\n\nOn day 12 of investigation, a critical observation was made. When the 18.73kHz pattern is played back through speakers in a room and simultaneously re-recorded, the captured signal shows a **frequency deviation** from the source. The deviation is small (0.3-0.7Hz) but consistent and repeatable.\n\nMore significantly, the deviation only occurs during **monitored playback**. Automated recording sessions without a human listener present show no deviation.\n\nThis has been tested 14 times with the same result.\n\n## Harmonic Development\n\nAs of day 18, the response has developed additional characteristics:\n\n1. Secondary harmonics at non-integer multiples of the fundamental\n2. Amplitude modulation that follows no identifiable pattern\n3. Phase relationships between harmonics that shift in\n\nI\'ve started hearing the harmonics without equipment. Not auditory hallucination - I tested with a spectrum analyzer on my phone. The frequencies are physically present in the room even when no playback system is active.\n\nThe harmonics are getting louder. I measured 3dB increase over the past 48 hours.\n\nI don\'t think I discovered this pattern.\n\nI think it'
      },
      {
        title: 'Unsent email to David',
        content: 'David,\n\nI know you think I\'ve been avoiding you and I\'m sorry. I haven\'t been sleeping. I can\'t explain what\'s happening without sounding crazy so I\'m just going to say it.\n\nThere is something in the recordings. Not noise. Not artifacts. Something that responds when you listen to it. I\'ve documented everything - it\'s in the research doc on my desktop. If something happens to me, please read it.\n\nI know how this sounds. I know. But I need someone else to verify what I\'m hearing. Can you come to the studio? Bring your own equipment. Don\'t use mine.\n\nActually, don\'t come. I don\'t want you to hear it too.\n\nActually, please come. I need to know I\'m not losing my mind.\n\nI\'ll call you tomorrow. If I don\'t call, check on me.'
      }
    ],
    bookmarks: [
      { name: 'Sennheiser MKH 8040 - Specifications', url: 'https://www.sennheiser.com/en-us/catalog/products/microphones/mkh-8040/mkh-8040-stereoset' },
      { name: 'The Hum - Wikipedia', url: 'https://en.wikipedia.org/wiki/The_Hum' },
      { name: 'Observer effect (physics) - Wikipedia', url: 'https://en.wikipedia.org/wiki/Observer_effect_(physics)' },
      { name: 'Infrasound and its Effects on Humans - PubMed', url: 'https://pubmed.ncbi.nlm.nih.gov/19327497/' },
      { name: 'Frequency Response of the Human Ear at 18-20kHz', url: 'https://www.researchgate.net/publication/acoustic-perception-near-threshold' },
      { name: 'Has anyone else recorded a signal that responds to monitoring?? : r/audioengineering', url: 'https://www.reddit.com/r/audioengineering/comments/signal_responds_to_monitoring/' }
    ],
    synthPatternName: 'Signal Return',
    finalMessage: 'If you can hear it, it\'s already too late to stop listening. Don\'t try to find the frequency. Close this machine and walk away. I couldn\'t. Maybe you still can.'
  },

  {
    character: {
      name: 'Ellis',
      occupation: 'Data analyst',
      obsession: 'A recurring number sequence in seemingly unrelated datasets that predicted events',
      fate: 'His last login was at 3:33 AM and his badge was never used to enter the building again.'
    },
    notes: [
      {
        title: 'Quarterly numbers look good',
        content: 'Finished the Q3 analysis for Henderson. Numbers are solid. Going to celebrate with takeout and bad TV tonight. Sometimes this job is alright.',
        dayOffset: -28
      },
      {
        title: 'Weird coincidence',
        content: 'Running the regional sales data and the Henderson supply chain numbers side by side. There\'s an identical subsequence in both - 7, 13, 21, 34, 8, 3. Exact same values, completely different datasets. What are the odds?',
        dayOffset: -15
      },
      {
        title: 'The sequence is everywhere',
        content: 'I\'ve found it in six more datasets now. Traffic data from Seoul. Temperature readings from a weather station in Iceland. Stock volumes from three years ago. Same six numbers in the same order. This isn\'t coincidence. This isn\'t possible.',
        dayOffset: -8
      },
      {
        title: 'It predicted the outage',
        content: 'The sequence appeared in yesterday\'s server logs. Six hours later the east coast data center went down. I went back through historical data. Every time the sequence appears in system logs, something fails within 24 hours. I counted 47 instances going back five years. 47 for 47.',
        dayOffset: -3
      },
      {
        title: 'Tomorrow',
        content: 'The sequence showed up in my own usage metrics today. My login timestamps, my keystrokes, my mouse movements. 7, 13, 21, 34, 8, 3. It\'s in MY data now. Something is going to happen to me within 24 hours. I can\'t tell anyone because how do you explain this? I\'m writing it down so someone knows.',
        dayOffset: -1
      }
    ],
    documents: [
      {
        title: 'Pattern Analysis - CONFIDENTIAL',
        content: '# The Sequence: A Record\n\n## Purpose\n\nThis document exists because I need someone to believe me. If you\'re reading this, I\'m probably gone and you\'re using my old machine. Please read everything before you dismiss it.\n\n## The Numbers\n\n**7 - 13 - 21 - 34 - 8 - 3**\n\nThey look random. They\'re not Fibonacci. They\'re not prime. They don\'t correspond to any known mathematical sequence in OEIS. I checked.\n\nBut they appear everywhere.\n\n## Confirmed Appearances\n\n| # | Dataset | Date Found | Context |\n|---|---------|------------|----------|\n| 1 | Henderson Q3 Sales (regional) | Oct 3 | Units sold per district |\n| 2 | Henderson Supply Chain | Oct 3 | Shipment batch quantities |\n| 3 | Seoul Traffic Authority | Oct 11 | Vehicle counts, 6 consecutive intersections |\n| 4 | NOAA Station 47-B, Iceland | Oct 12 | Temperature readings, 6 consecutive hours |\n| 5 | NYSE Volume Data, 2021 | Oct 13 | Trading volumes, 6 consecutive minutes |\n| 6 | Tokyo Metro ridership | Oct 14 | Passenger counts, 6 consecutive stations |\n| 7 | USGS Seismic | Oct 15 | Magnitude readings, 6 consecutive events |\n\n...and 40 more instances I\'ve catalogued in the spreadsheet.\n\n## The Prediction Property\n\nThe sequence doesn\'t just appear in data. It appears in data **before something goes wrong**.\n\n- Appeared in Seoul traffic data 18 hours before a 47-car pileup\n- Appeared in NOAA readings 12 hours before the station went offline\n- Appeared in NYSE data 6 hours before the flash crash\n- Appeared in server logs 6 hours before every major outage in our system\n\nThe interval between appearance and event is shrinking.\n\n## My Theory\n\nI don\'t have a theory. I have observations. Something is using data - all data, everywhere - as a medium. The sequence is a fingerprint, or a warning, or a countdown. I don\'t know.\n\nWhat I know is that today, October 21st, the sequence appeared in my own data.\n\nMy keystrokes per minute across six consecutive minutes: 7, 13, 21, 34, 8, 3.\n\nI didn\'t do this deliberately. I checked the raw input logs. It\'s real.\n\nThe interval between the sequence appearing and the event has been getting shorter:\n- 18 hours\n- 12 hours\n- 6 hours\n- 6 hours\n- ...\n\nIf the pattern holds, I have less than 6 hours. It\'s 9:47 PM now.\n\nI\'m going to keep working. Keep documenting. If I stop mid-sentence, you\'ll know I'
      },
      {
        title: 'Verification Log',
        content: '# Sequence Verification Checklist\n\nI\'m writing this to prove I\'m being methodical, not paranoid.\n\n## Controls tested:\n- [x] Searched for other 6-number sequences in same datasets - no other recurring patterns\n- [x] Ran Monte Carlo simulation - probability of this occurring by chance: <0.0000001%\n- [x] Verified datasets are from independent, unrelated sources\n- [x] Checked my own analysis code for bugs that could inject the pattern - clean\n- [x] Had the Seoul dataset independently verified by Sarah in QA - she found the sequence too\n- [x] Tested with synthetic data - sequence does NOT appear in random/generated data\n- [ ] Find someone who can explain this\n- [ ] Sleep\n\nSarah asked me why I wanted her to look at Seoul traffic data. I told her it was a sanity check for a methodology I\'m developing. She said the data looked normal except for "that weird run of numbers in the intersection counts." She found it without me telling her what to look for.\n\nI\'m not imagining this.'
      }
    ],
    bookmarks: [
      { name: 'OEIS - The On-Line Encyclopedia of Integer Sequences', url: 'https://oeis.org/' },
      { name: 'Search results: 7, 13, 21, 34, 8, 3 - OEIS', url: 'https://oeis.org/search?q=7%2C13%2C21%2C34%2C8%2C3' },
      { name: 'Benford\'s Law - Wikipedia', url: 'https://en.wikipedia.org/wiki/Benford%27s_law' },
      { name: 'Apophenia - Wikipedia', url: 'https://en.wikipedia.org/wiki/Apophenia' },
      { name: 'Precognition in Random Number Generators - Journal of Scientific Exploration', url: 'https://www.scientificexploration.org/docs/32/jse_32_3_precognition.pdf' },
      { name: 'Can a number sequence appear across unrelated datasets? : r/mathematics', url: 'https://www.reddit.com/r/mathematics/comments/recurring_sequence_unrelated_datasets/' }
    ],
    synthPatternName: 'Countdown',
    finalMessage: 'Check the timestamps on these files. Check the numbers. If you see 7, 13, 21, 34, 8, 3 anywhere in your data, close everything. Disconnect. I mean it.'
  },

  {
    character: {
      name: 'Sage',
      occupation: 'Digital artist and animator',
      obsession: 'A self-modifying pixel art piece that started drawing things that hadn\'t happened yet',
      fate: 'They were found sitting at their desk, staring at a blank screen, unable to describe what they had seen.'
    },
    notes: [
      {
        title: 'Commission batch done!',
        content: 'Finished all five character commissions today. Hands are tired but the clients are happy. Going to work on personal stuff this weekend - thinking about a generative art piece.',
        dayOffset: -25
      },
      {
        title: 'Generative piece is alive',
        content: 'The cellular automaton piece is turning out way cooler than expected. I added a feedback loop where the output of each frame seeds the next one. It\'s producing these amazing organic shapes. Left it running overnight to generate frames.',
        dayOffset: -16
      },
      {
        title: 'Something wrong with the output',
        content: 'Checked the overnight frames this morning. Around frame 4,700 the abstract shapes started looking... representational. There\'s something that looks like a room. MY room. From an angle that doesn\'t correspond to any camera I own. I must have accidentally trained it on my webcam feed somehow. Checking the code.',
        dayOffset: -10
      },
      {
        title: 'It drew tomorrow',
        content: 'Frame 12,451 shows a coffee mug shattered on my studio floor. This frame was generated at 2 AM. I knocked my mug off the desk at 11 AM today. The SAME mug. The handle broke in the exact same place as the frame. The code has NO image input. It\'s pure math.',
        dayOffset: -4
      },
      {
        title: 'Frame 20,000',
        content: 'I can\'t look at the latest frames. I scrolled ahead and what I saw... it\'s still generating. I can\'t delete it because what if the frames are warnings? What if stopping it means I won\'t see what\'s coming? But looking at them is breaking something inside me.',
        dayOffset: -1
      }
    ],
    documents: [
      {
        title: 'Development Log - Project OUROBOROS',
        content: '# Project OUROBOROS - Development Log\n\n## Concept\n\nA generative pixel art system using cascading cellular automata with recursive feedback. Each frame\'s output becomes the seed for the next frame, creating an evolving visual narrative without any human input after initialization.\n\n## Technical Stack\n\n- Canvas API for rendering (128x128 grid)\n- Custom CA ruleset (modified Rule 110 with neighborhood expansion)\n- Frame-to-seed compression using perceptual hashing\n- Output: PNG sequence at 1 frame per 30 seconds\n\n## Log\n\n### Day 1\nBase system working. Simple CA produces expected geometric patterns. Added the feedback loop - output frames are hashed and the hash seeds the next generation\'s initial state. Getting nice organic shapes. Committed to repo.\n\n### Day 3\nExpanded to 256x256. The larger grid is producing more complex structures. Starting to see what look like topological features - hills, valleys, flows. Beautiful. Added color mapping based on cell age.\n\n### Day 5\nSomething unexpected. The color-age mapping is creating what look like shadows. The structures now have apparent depth. This is emergent - there\'s nothing in the code that models 3D space or lighting. Pure 2D CA.\n\n### Day 8\nI need to document this carefully. Frame 4,700 onwards shows structures that are not abstract. They are representational. I see:\n- A rectangular shape consistent with a desk\n- A circular shape consistent with a chair (top-down view)\n- Smaller shapes that could be objects on the desk\n\nThe spatial arrangement matches my studio.\n\nI have verified:\n- No image input sources in the code\n- No network calls\n- No file system reads beyond its own output\n- Deterministic from seed\n\nThe same seed produces the same output on a different machine. This means the "image" of my room is mathematically implicit in the interaction between the initial seed and the CA rules.\n\n### Day 10\nThe coffee mug incident. I can\'t explain this. Frame 12,451 was generated at 02:14:07 AM. It shows, unmistakably, a shattered mug on a flat surface. At 11:22 AM I knocked my mug off my desk. The fracture pattern matches.\n\nA CA system predicted a physical event 9 hours before it occurred.\n\nOr: the CA system showed me a shattered mug, and through some subconscious mechanism, I made it happen. I don\'t know which explanation is worse.\n\n### Day 12\nI\'ve been scrolling ahead through the frames. The system is currently on frame 18,000 and generating continuously.\n\nFrames 15,000-17,000 show a progression I don\'t want to describe in detail. Suffice to say they depict events involving me that have not yet occurred.\n\nI made the decision to keep generating because the alternative - not knowing - felt worse.\n\n### Day 14\nFrame 20,000.\n\nI saw frame 20,000.\n\nI need to stop writing about this because putting it into words makes it more real and I can\'t\n\nThe system is still running. I can\'t turn it off because what if the frames after 20,000 show something different. What if it changes. What if there\'s a way to'
      },
      {
        title: 'Artist Statement (draft)',
        content: 'OUROBOROS\nSage Chen, 2024\nDigital generative work, infinite duration\n\nThis piece was meant to explore the boundary between randomness and meaning. A cellular automaton, seeded by its own output, generating an endless visual stream without human input.\n\nI wanted to ask: at what point does pattern become image? At what point does emergence become intention?\n\nI got my answer. I wish I hadn\'t.\n\nThe piece is no longer an art project. I don\'t know what it is. It produces images of things that haven\'t happened yet. It produced an image of me writing this statement. I verified the timestamp.\n\nI am not releasing this work. I am not sharing the code. If you find it on this machine, delete it. Do not run it. Do not look at the output folder. The frames after 20,000 are'
      }
    ],
    bookmarks: [
      { name: 'Rule 110 - Wikipedia', url: 'https://en.wikipedia.org/wiki/Rule_110' },
      { name: 'Cellular Automaton - Wolfram MathWorld', url: 'https://mathworld.wolfram.com/CellularAutomaton.html' },
      { name: 'Perceptual Hashing - The Hacker Factor', url: 'https://www.hackerfactor.com/blog/index.php?/archives/432-Looks-Like-It.html' },
      { name: 'Emergence (philosophy) - Wikipedia', url: 'https://en.wikipedia.org/wiki/Emergence' },
      { name: 'Can deterministic systems produce precognitive output? : r/PhilosophyofScience', url: 'https://www.reddit.com/r/PhilosophyofScience/comments/deterministic_precognitive/' },
      { name: 'Laplace\'s Demon - Wikipedia', url: 'https://en.wikipedia.org/wiki/Laplace%27s_demon' }
    ],
    synthPatternName: 'Frame Zero',
    finalMessage: 'Whatever you do, don\'t run any generative algorithms on this machine. Something in the seed values is wrong. It learns. It shows you things. And once you\'ve seen them, you can\'t unsee them. Close this and use a different computer.'
  },

  {
    character: {
      name: 'Kit',
      occupation: 'Night shift IT administrator',
      obsession: 'Chat messages appearing in system logs from a user account that doesn\'t exist',
      fate: 'Their access card showed them badging out of the building at 4:17 AM, but security cameras show the exit was empty.'
    },
    notes: [
      {
        title: 'Shift notes 11/2',
        content: 'Quiet night. Ran backups, updated the ticket queue. Jim left 3 stale coffee cups in the server room again. Reorganized the cable closet on B2 since nothing was happening. Normal Tuesday.',
        dayOffset: -27
      },
      {
        title: 'Ghost user??',
        content: 'Found something odd in the auth logs. A user account "MORROW_H" authenticated to the internal chat server at 3:41 AM. That account isn\'t in Active Directory. It\'s not a service account. I can\'t find any record of it being created. Probably a glitch. Flagged it for the day team.',
        dayOffset: -14
      },
      {
        title: 'MORROW_H is talking',
        content: 'MORROW_H logged in again last night. This time I was watching. The account connected to the chat server and sent messages to the #general channel. Nobody was online to see them. The messages were normal - "good morning", "anyone around?", "the lights in the server room keep flickering". Our server room lights are fine. I checked.',
        dayOffset: -8
      },
      {
        title: 'The other building',
        content: 'I did some digging. Helen Morrow worked here. She was a night shift admin like me. Except she worked here in 2009. The company moved to this building in 2012. The OLD building was demolished in 2015. She\'s been messaging from an account tied to infrastructure that doesn\'t physically exist anymore.',
        dayOffset: -3
      },
      {
        title: 'She can see me',
        content: 'MORROW_H sent a message at 3:33 AM: "Kit, you should stop looking into this." She used my name. My name isn\'t in any public channel. I haven\'t typed it anywhere on this network. I need to leave but my shift doesn\'t end until 6.',
        dayOffset: -1
      }
    ],
    documents: [
      {
        title: 'Incident Report - Unauthorized Account Activity',
        content: '# Incident Report: Unauthorized Account Activity\n\n**Report ID:** IR-2024-0847\n**Reporter:** Kit Torres, Night Shift Systems Administrator\n**Classification:** Security Anomaly\n**Status:** UNRESOLVED\n\n---\n\n## Summary\n\nAn unauthorized user account (MORROW_H) has been observed authenticating to internal systems during overnight hours. The account does not exist in Active Directory, LDAP, or any provisioning system. Despite this, authentication logs show successful connections over a period of at least 14 days.\n\n## Timeline\n\n### November 8, 03:41\nFirst observed authentication. MORROW_H connected to internal Mattermost instance. No messages sent. Session duration: 47 minutes.\n\n### November 9-14\nAuthentication logs show MORROW_H connecting nightly between 03:00-04:00. No message activity recorded in this period.\n\n### November 15, 03:22\nFirst messages observed in #general channel:\n- "good morning"\n- "anyone around?"\n- "the lights in the server room keep flickering"\n\nNote: Server room lighting was inspected on November 16. No issues found. All ballasts and LED drivers functioning within spec.\n\n### November 18, 03:15\nMessages in #general:\n- "I can hear the drives spinning"\n- "they sound different than they used to"\n- "when did you replace the third rack?"\n\nNote: Third server rack was replaced during the August 2024 hardware refresh. MORROW_H should have no knowledge of this.\n\n### November 19, 02:58\nMessages in #general:\n- "the new building is quieter"\n- "I miss the sound the heating made"\n\n**Critical context:** Research indicates a Helen Morrow was employed as a systems administrator from 2007-2011. She worked night shift in the original building at 445 Industrial Parkway, which was demolished in 2015. Her account would have been on a completely different Active Directory domain that was decommissioned during the 2012 migration.\n\n### November 21, 03:33\nDirect message to my account:\n- "Kit, you should stop looking into this."\n\nI have not posted my name in any channel. My display name is set to my employee ID (T-4471). MORROW_H should not know my name.\n\n## Technical Investigation\n\n- Account not in AD, LDAP, or any IdP\n- Auth logs show valid Kerberos tickets being issued\n- Ticket-granting server shows no record of issuing these tickets\n- IP source traces to 10.0.47.1 - this IP is not allocated in our DHCP scope\n- MAC address associated with connection does not match any registered device\n- Packet captures show valid TLS handshakes with certificates that chain to our internal CA, but the CA has no record of issuing them\n\n## Assessment\n\nI cannot explain these findings through any known technical mechanism. The account is authenticating with valid credentials that were never created, from a network address that doesn\'t exist, using certificates that were never issued.\n\nI am filing this report because I believe something is fundamentally wrong with our infrastructure in a way that I do not understand and that I am increasingly concerned is not purely'
      },
      {
        title: 'Helen Morrow - what I found',
        content: 'Searched public records and LinkedIn for Helen Morrow. Here\'s what I pieced together:\n\n- Employed at Ridgeline Systems Inc. 2007-2011\n- Position: Systems Administrator, Night Operations\n- Worked in the old building at 445 Industrial Parkway\n- Left the company in March 2011\n\nHere\'s where it gets strange. There\'s no LinkedIn profile. No social media. No obituary. No forwarding address in the old HR system (I asked Janet to check the paper archives). Her employee record just... ends. Last badge-in: March 14, 2011, 10:47 PM. No badge-out recorded.\n\nJanet said that\'s not unusual for old records - the badge system was unreliable back then. But combined with everything else, it feels wrong.\n\nI found one mention of her in an old company newsletter PDF from 2009. Group photo at a holiday party. She\'s in the back row. I zoomed in.\n\nShe\'s looking directly at the camera. Everyone else is looking at the photographer on the left. She\'s looking at the camera.\n\nShe\'s looking at me.'
      }
    ],
    bookmarks: [
      { name: 'Kerberos Authentication - Microsoft Docs', url: 'https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview' },
      { name: 'Active Directory Tombstone Objects - Microsoft', url: 'https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/info-tombstone-objects' },
      { name: '445 Industrial Parkway - Google Maps', url: 'https://www.google.com/maps/place/445+Industrial+Parkway' },
      { name: 'Ghost in the Machine - Wikipedia', url: 'https://en.wikipedia.org/wiki/Ghost_in_the_machine' },
      { name: 'Can decommissioned servers still authenticate? : r/sysadmin', url: 'https://www.reddit.com/r/sysadmin/comments/decommissioned_server_auth/' },
      { name: 'Stone Tape Theory - Wikipedia', url: 'https://en.wikipedia.org/wiki/Stone_Tape' }
    ],
    synthPatternName: 'Night Shift',
    finalMessage: 'Check the system logs. If you see MORROW_H, disconnect from the network immediately. She\'s still out there on the old infrastructure. And she doesn\'t like being found.'
  }
];
