
import { walletUsages } from "@/db/schemas";
import { SQL, sql, getTableColumns, eq } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db/db";
import { Location, ProgramSession, Wallet } from "@/types";
import { wallets } from "@/db/schemas";
import { VendorStripePayments } from "./stripe";
import { isBefore } from "date-fns";

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

function isSessionPasted(session: ProgramSession, selectedDay: Date) {
    const today = new Date();
    const sessionTime = getSessionTime(session);
    const isPasted = isBefore(selectedDay, today) ? sessionTime.getTime() < today.getTime() : false;
    return isPasted;
}

function getSessionTime(session: ProgramSession) {
    const [hours, minutes] = session.time.split(':').map(Number);
    const sessionTime = new Date();
    sessionTime.setHours(hours, minutes, 0, 0);
    return sessionTime;
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
function getSessionState(session: ProgramSession, mid: number) {
    const reservations = session.reservations?.length ?? 0;
    let recurringReservations = 0;
    if (session.recurringReservations && session.recurringReservations.length > 0) {
        recurringReservations = session.recurringReservations.filter(rr => rr.exceptions?.length === 0).length;
    }
    const availability = (session.program?.capacity!) - (reservations + recurringReservations);

    const hasRecurringReservations = session.recurringReservations?.some(r => r.memberId === mid) ?? false;
    const hasReservations = session.reservations?.some(r => r.memberId === mid) ?? false;

    const isReserved = hasRecurringReservations || hasReservations;

    const isFull = availability <= 0;

    return { isReserved, isFull };
}


export {
	formatPhoneNumber,
	buildConflictUpdateColumns,
	generateOtp,
	checkWalletBalance,
	chargeWallet,
	isSessionPasted,
	getSessionTime,
	getSessionState
}