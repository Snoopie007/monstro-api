
import { walletUsages } from "@/db/schemas";
import { SQL, sql, getTableColumns, eq } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db/db";
import { Location, Wallet } from "@/types";
import { wallets } from "@/db/schemas";
import { VendorStripePayments } from "./stripe";

const buildConflictUpdateColumns = <
	T extends PgTable,
	Q extends keyof T['_']['columns']
>(
	table: T,
	columns: Q[],
) => {
	const cls = getTableColumns(table);
	return columns.reduce((acc, column) => {
		const colName = cls[column].name;
		acc[column] = sql.raw(`excluded.${colName}`);
		return acc;
	}, {} as Record<Q, SQL>);
};



function formatPhoneNumber(phoneNumber: string): string {
	return phoneNumber.startsWith('+')
		? phoneNumber.replace(/[^0-9+]/g, '')
		: `+${phoneNumber.replace(/[^0-9]/g, '')}`;
}
function generateOtp() {
	return Math.floor(100000 + Math.random() * 900000).toString();
}



async function checkWalletBalance(location: Location) {
	const wallet = location.wallet;
	if (!wallet) { throw new Error("Wallet not found") }

	try {
		if (wallet.balance < wallet.rechargeThreshold) {
			const stripe = new VendorStripePayments();
			const vendor = await db.query.vendors.findFirst({
				where: (vendor, { eq }) => eq(vendor.id, location.vendorId)
			});
			if (!vendor || !vendor.stripeCustomerId) { throw new Error("Vendor not found") }
			stripe.setCustomer(vendor.stripeCustomerId);
			const { clientSecret } = await stripe.createPaymentIntent(wallet.rechargeAmount, undefined, {
				description: `Auto-charge USD ${wallet.rechargeAmount / 100} was successfully added to wallet.`,
				metadata: {
					locationId: wallet.locationId
				}
			});
			if (!clientSecret) { throw new Error("Payment failed") }
			wallet.balance += wallet.rechargeAmount;
		}

		await db.update(wallets).set({
			balance: wallet.balance,
			credits: wallet.credits,
			lastCharged: new Date()
		}).where(eq(wallets.id, wallet.id))


		location.wallet = wallet;
		return location;
	} catch (error) {
		console.error("Error charging wallet:", error);
		throw new Error("Error charging wallet");
	}
}

async function chargeWallet(location: Location, amount: number, description: string) {
	let isCredit = false;
	let wallet = location.wallet;
	if (!wallet) { throw new Error("Wallet not found") }


	if (wallet.credits > amount) {
		wallet.credits -= amount;
		isCredit = true;
	} else {
		wallet.balance -= amount;
	}


	try {

		db.transaction(async (tx) => {
			await tx.update(wallets).set({
				balance: wallet.balance,
				credits: wallet.credits,
				updated: new Date()
			}).where(eq(wallets.id, wallet.id))

			await tx.insert(walletUsages).values({
				walletId: wallet.id,
				balance: wallet.balance,
				amount: amount,
				isCredit,
				description,
				activityDate: new Date()
			})
		})
		location.wallet = wallet;
		return location;
	} catch (error) {
		console.error("Error charging wallet:", error);
		throw new Error("Error charging wallet");
	}
}


export {
	formatPhoneNumber,
	buildConflictUpdateColumns,
	generateOtp,
	checkWalletBalance,
	chargeWallet
}