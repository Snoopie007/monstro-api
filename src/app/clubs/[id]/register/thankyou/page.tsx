'use client'
import { signOut } from "next-auth/react"
import { useEffect } from "react";


export default function Thankyou() {
	useEffect(() => {
		window.localStorage.clear();
		signOut({ redirect: false });
	}, []);
	return (
		<div className="max-w-4xl py-4 m-auto text-center text-black">
			<h1>Congratulations</h1>
			<p>You have successfully registered.</p>
		</div>
	)
}