
// import { NextResponse } from 'next/server';

// import { VendorStripePayments } from '@/libs/server/stripe';


// let stripe = new VendorStripePayments();

// export async function POST(req: Request) {
//     const data = await req.json();
//     const { token, state } = data;



//     try {

//         stripe = stripe.setCustomer("cus_RoPPHL0v3yNJkO")

//         const res = await stripe.createSubSchedule("price_1QuLaWDePDUzIffAo7JtMv5i", new Date("2025-04-1"), new Date("2026-04-1"), {
//             vendorId: "25",
//             locationId: "253242423423"
//         })

//         console.log(res)

//         return NextResponse.json({ success: true }, { status: 200 })
//     } catch (err) {
//         console.log(err)
//         return NextResponse.json({ error: err }, { status: 500 })
//     }
// }
import { NextResponse } from 'next/server';
export async function GET(req: Request) {
	try {

		return NextResponse.json({ status: 200 });
	} catch (err) {
		// console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}


