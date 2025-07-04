'server only'
// import Stripe from "stripe";
import Sqids from 'sqids';


const referralCodeSqids = new Sqids({
    alphabet: 'abcdefghijklmnopqrstuvwxyz0123456789',
    minLength: 5,
})

const encodeReferralCode = (id: number) => referralCodeSqids.encode([id]);


const sqids = new Sqids({
    alphabet: 'abcdefghijklmnopqrstuvwxyz0123456789',
    minLength: 14,
})

const decodeId = (id: string) => sqids.decode(id)[0];
const encodeId = (id: number) => sqids.encode([id, 2, 3]);

export {
    decodeId,
    encodeId,
    encodeReferralCode
}