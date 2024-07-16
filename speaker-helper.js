module.exports = {
    init(speakerInstance) {
      // Initialize the speaker with any necessary setup
      this.speaker = speakerInstance;
    },
    open() {
      if (this.speaker) {
        // Custom logic to handle when the speaker opens
        console.log('Speaker opened');
      }
    },
    close() {
      if (this.speaker) {
        // Custom logic to handle when the speaker closes
        console.log('Speaker closed');
      }
    }
  };
  