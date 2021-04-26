const prompts = [
    {
        pattern: /(^hi)|hello|hey/i,
        responses: [
            "Heyyyyyy",
            "Hello!",
            "Hi",
            "Hey there",
            "Hello there!"
        ]
    },
    {
        pattern: /tell/i,
        responses: [
            "No",
            "No thanks",
            "I don't think I will.",
            "Nah fam"
        ]
    },
    {
        pattern: /who|what|how|when/i,
        responses: [
            "I do not know",
            "I don't know",
            "Why would I know?",
            "Who knows"
        ]
    },
    {
      pattern: /(will|would|should).*\??/i,
      responses: [
        "Yes",
        "No",
        "Maybe",
        "Probably"
      ]
    },
    {
        pattern: /bye/i,
        responses: [
            "Bye please",
            "Byeeeeee",
            "RIP to this great conversation"
        ]
    },
    {
      pattern: /hah|lol|lmao|xd/i,
      responses: [
        "What's so funny?",
        "Hahahahahahahahahahaha",
        "Wow so funny",
        "You're so silly"
      ]
    },
    {
      pattern: /thank/i,
      responses: [
        "You're welcome!",
        "No, thank you!",
        "All in a day's work!",
      ]
    },
    {
        pattern: /you/i,
        responses: [
            "Right back at ya",
            "You too :)",
            "Same to you",
            "Thanks, friend",
            "Thanks",
            "thx m8",
            "Cheers"
        ]
    },
    {
        pattern: /help/i,
        responses: [
            "Help yourself.",
            "That is not my job.",
            "That's not in my job description",
            "Is my name Help Bot? Didn't think so."
        ]
    },
    {
        pattern: /no|nah|negative/i,
        responses: [
            "No",
            "Nah",
            "No no"
        ]
    },
    {
        pattern: /.*/, 
        responses: [
            "Yeah?",
            "Okay.",
            "Nice",
            "Got it.",
            "Cool.",
            "Amazing."
        ]
    }
];

/**
 * Respond as the welcome bot given input
 * @param {string} message the user's message
 * @returns the response from the bot
 */
function getResponse(message) {
    for(let prompt of prompts) {
        if(prompt.pattern.test(message)) {
            const responses = prompt.responses;
            return responses[Math.floor(Math.random() * responses.length)];
        }
    }
}