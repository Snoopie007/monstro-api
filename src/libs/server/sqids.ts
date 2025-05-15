'server only'
// import Stripe from "stripe";
import Sqids from 'sqids';


const referralCodeSqids = new Sqids({
    alphabet: process.env.SQIDS_ALPHABET,
    minLength: 5,
})

const encodeReferralCode = (id: number) => referralCodeSqids.encode([id]);


const sqids = new Sqids({
    alphabet: process.env.SQIDS_ALPHABET,
    minLength: Number(process.env.SQIDS_LENGTH),
})

const decodeId = (id: string) => sqids.decode(id)[0];

const encodeId = (id: number) => sqids.encode([id, 2, 3]);

export {
    decodeId,
    encodeId,
    encodeReferralCode
}