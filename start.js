const path = require('path');
const { exec } = require('child_process');
const GoogleAssistant = require('google-assistant');
const Speaker = require('speaker');
const recorder = require('node-record-lpcm16');
const speakerHelper = require('./speaker-helper');
const { LumiaSdk, LumiaActivityCommandTypes, LumiaAlertValues, LumiaEventTypes } = require('@lumiastream/sdk');

const token = 'lumia892089382';
const appName = 'ollodeck';

const sdk = new LumiaSdk();

const config = {
  auth: {
    keyFilePath: path.resolve(__dirname, 'credentials.json'),
    savedTokensPath: path.resolve(__dirname, 'tokens.json'),
  },
  conversation: {
    audio: {
      encodingIn: 'LINEAR16',
      sampleRateIn: 16000,
      encodingOut: 'LINEAR16',
      sampleRateOut: 24000,
    },
    lang: 'en-US',
    isNew: true,
    screen: {
      isOn: true,
    },
  },
};

const assistant = new GoogleAssistant(config.auth);

const startConversation = (conversation) => {
  console.log('Say something!');
  let openMicAgain = false;
  let micStream;

  const startMic = () => {
    micStream = recorder.record({
      sampleRate: config.conversation.audio.sampleRateIn,
      threshold: 0,
      verbose: false,
      recordProgram: 'rec', // Adjust this based on your system ('rec' or 'sox')
      silence: '10.0', // Silence threshold in seconds
      channels: 1, // Mono recording
    }).stream();

    micStream
      .on('data', (data) => {
        // Write microphone data to conversation
        conversation.write(data)
      })
      .on('error', (error) => {
        // Handle microphone recording errors
        console.error('Microphone Error:', error);
      })
      .on('end', () => {
        // Handle end of microphone recording (optional)
        console.log('Microphone Stream Ended');
      });
  };

  // Function to handle custom commands
  const handleCustomCommand = async (text) => {
    if (text.toLowerCase().includes('open console')) {
      exec('konsole', (error, stdout, stderr) => {
        if (error) {
          console.error(`Error opening Konsole: ${error}`);
          return;
        }
        console.log(`Konsole opened: ${stdout}`);
      });
    }
    // Add more custom commands as needed

    await sdk.init({ name: appName, token });
  };

  // Set up the conversation event handlers
  conversation
    .on('audio-data', (data) => {
      // Send audio data to speaker
      speakerInstance.write(data);
    })
    .on('end-of-utterance', () => {
      // Stop recording when user stops speaking
      micStream.pause();
    })
    .on('transcription', (data) => {
      // Log transcription of user speech
      console.log('Transcription:', data.transcription, ' --- Done:', data.done);
      if (data.done) {
        handleCustomCommand(data.transcription);
      }
    })
    .on('response', (response) => {
      // Log assistant's response
      console.log('Assistant Text Response:', response);
      handleCustomCommand(response);
    })
    .on('volume-percent', (percent) => {
      // Log volume change requests
      console.log('New Volume Percent:', percent);
    })
    .on('device-action', (action) => {
      // Handle device actions if needed
      console.log('Device Action:', action);
    })
    .on('ended', (error, continueConversation) => {
      // Handle end of conversation
      if (error) {
        console.log('Conversation Ended Error:', error);
      } else if (continueConversation || openMicAgain) {
        openMicAgain = true;
      } else {
        console.log('Conversation Complete');
        assistant.start(config.conversation);
      }
      if (openMicAgain) {
        assistant.start(config.conversation);
      } else {
        startMic();  // Restart the microphone for the next conversation
      }
    })
    .on('error', (error) => {
      // Handle conversation errors
      console.log('Conversation Error:', error);
    });

  startMic();

  // Set up the speaker
  const speakerInstance = new Speaker({
    channels: 1,
    sampleRate: config.conversation.audio.sampleRateOut,
  });

  speakerHelper.init(speakerInstance);

  speakerInstance
    .on('open', () => {
      console.log('Assistant Speaking');
      speakerHelper.open();
    })
    .on('close', () => {
      console.log('Assistant Finished Speaking');
      if (openMicAgain) {
        assistant.start(config.conversation);
      } else {
        startMic();  // Restart the microphone for the next conversation
      }
    });
};

// Set up assistant event handlers
assistant
  .on('ready', () => {
    console.log('Assistant is ready');
    assistant.start(config.conversation);
  })
  .on('started', startConversation)
  .on('error', (error) => {
    console.error('Assistant Error:', error);
  });
// Enhanced Logging
assistant
  .on('request', (request) => {
    console.log('Assistant Request:', request);
  })
  .on('response', (response) => {
    console.log('Assistant Response:', response);
  });