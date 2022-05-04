const IS_SERVER = false;
radio.setGroup(69);
radio.setTransmitPower(7);
radio.setTransmitSerialNumber(true);

/**
 * protocol:
 *      client-bound:
 *          enabled: 1/0 -> enables/disables voting
 *          ack: deviceSN -> acknowledges received vote
 *      server-bound:
 *          vote: option -> sends a vote; option must be within 1 and 26 (inclusive)
 */

const A = 65, Z = 90, // ASCII values for capital A and Z
      AT_KEY = 64;    // Unless we also want to display other positions too

if (IS_SERVER) {
    let votes: {
        [serialNumber: number]: number;
    } = {};

    let votingAllowed = false;

    input.onButtonPressed(Button.A, () => {
        if (votingAllowed) return;
        votingAllowed = true;

        radio.sendValue("enabled", 1);

        console.log("Waiting for votes...");
    });

    input.onButtonPressed(Button.B, () => {
        if (!votingAllowed) return;
        votingAllowed = false;

        radio.sendValue("enabled", 0);

        if (Object.keys(votes).length !== 0) {
            console.log("Voting concluded!");

            const votesByLetter: {
                [option: number]: number;
            } = {};

            for (const key of Object.keys(votes)) {
                // Hopefully, when saved into the object, number index
                // should get coerced into a string like in regular JS
                // @ts-ignore
                votesByLetter[votes[key]] = (votesByLetter[votes[key]] || 0) + 1;
            }

            for (const key of Object.keys(votesByLetter)) {
                // This should also be a legal move, again assuming
                // that the implementation is correct here
                // @ts-ignore
                console.log(`${String.fromCharCode(parseInt(key))}: ${votesByLetter[key]}`);
            }
        } else {
            console.log("Voting disabled.");
        }
    });

    input.onButtonPressed(Button.AB, () => {
        console.log("Resetting votes!");
        votes = {};
    })

    radio.onReceivedValue((k, v) => {
        const sn = radio.receivedPacket(RadioPacketProperty.SerialNumber);

        if (k === "vote") {
            if (!votingAllowed) return;

            const voteChar = v + AT_KEY;

            if (voteChar < A || voteChar > Z) { // Invalid vote!
                console.log(`${sn} attempted to cast an invalid vote! (voted ${v})`);
                return;
            }

            votes[sn] = voteChar;
        }
    });
} else {
    let canVote = false;
    let vote = A - AT_KEY;
    
    music.setVolume(255);

    console.log(control.deviceSerialNumber());

    basic.showString("A", 0);

    radio.onReceivedValue((k, v) => {
        console.logValue(k, v);
        if (k === "enabled") {
            if (v === 1) console.log("enabling voting!");
            canVote = v === 1;
        } else if (k === "ack") {
            if (v === control.deviceSerialNumber()) {
                music.playTone(10000, 1000);
            }
        }
    });

    input.onButtonPressed(Button.A, () => {
        if (!canVote) return;
        vote = Math.constrain(vote - 1, A - AT_KEY, Z - AT_KEY);

        basic.showString(String.fromCharCode(vote + AT_KEY), 0);
    });

    input.onButtonPressed(Button.B, () => {
        if (!canVote) return;
        vote = Math.constrain(vote + 1, A - AT_KEY, Z - AT_KEY);

        basic.showString(String.fromCharCode(vote + AT_KEY), 0);
    });

    input.onLogoEvent(TouchButtonEvent.Pressed, () => {
        if (!canVote) return;

        radio.sendValue("vote", vote);
    });
}
