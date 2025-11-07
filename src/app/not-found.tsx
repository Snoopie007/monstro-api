import { cn } from "@/libs/utils";
import Link from "next/link";
import React from "react";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/libs/auth/server";

async function NotFoundContent() {
	const session = await auth();
	return (
		<div className="flex-1 flex items-center justify-center p-8">
			<div className="max-w-md w-full border-0">
				<div className="p-8 text-center">
					<div className="mb-8">
						<div className="text-8xl font-bold text-primary dark:text-white mb-4">
							404
						</div>
						<h1 className="text-2xl font-bold text-foreground mb-2">
							Page Not Found
						</h1>
						<p className="text-muted-foreground">
							The page you're looking for doesn't exist or has been moved.
						</p>
					</div>

					<div className="space-y-4">
						<div className="flex flex-col sm:flex-row gap-3 justify-center">
							<Link
								href={session ? "/dashboard/locations" : "/login"}
								className="flex items-center gap-2 justify-center"
							>
								<ArrowLeft size={16} />
								{session ? "Go Back to Your Locations" : "Go Back to Login"}
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default async function NotFound(props: {
	params: Promise<{ id: string }>;
}) {

	return (
		<main
			className={cn(
				"min-h-screen max-h-screen h-screen flex flex-col w-full bg-background"
			)}
		>
			<div className="relative flex flex-1 flex-row justify-center items-center w-full">
				<div className="flex-1 h-[calc(100vh-52px)] overflow-auto flex items-center justify-center">
					<NotFoundContent />
				</div>
			</div>
		</main>
	);
}
