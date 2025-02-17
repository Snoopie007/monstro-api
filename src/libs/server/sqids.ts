'server only'
// import Stripe from "stripe";
import Sqids from 'sqids';


// export const getStripe = (key?: string) => {
//     return new Stripe(key || process.env.STRIPE_SECRET_KEY!, {
//         // apiVersion: "2024-10-28.acacia",
//         appInfo: {
//             name: "My Monstro",
//             url: "https:/mymonstro.com",
//         },
//     });
// }


const sqids = new Sqids({
    alphabet: process.env.SQIDS_ALPHABET,
    minLength: Number(process.env.SQIDS_LENGTH),
})

const decodeId = (id: string) => sqids.decode(id)[0];
const encodeId = (id: number) => sqids.encode([id, 2, 3]);

export {
    decodeId,
    encodeId
}