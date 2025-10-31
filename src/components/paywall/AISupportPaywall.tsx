'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Zap } from 'lucide-react'

export function AISupportPaywall() {
	const upgradePageUrl = process.env.NEXT_PUBLIC_UPGRADE_PAGE ?? 'https://monstro-x.com/pricing'

	const handleUpgrade = () => {
		if (upgradePageUrl) {
			window.open(upgradePageUrl, '_blank')
		}
	}

	return (
		<div className="h-full p-4 pt-10">
			<Card className="max-w-lg mx-auto border-foreground/10 rounded-lg shadow-md">
				<CardHeader className="text-center">
					<div className="flex justify-center mb-4">
						<div className="bg-amber-100 p-3 rounded-lg">
							<Zap className="w-6 h-6 text-amber-600" />
						</div>
					</div>
					<CardTitle className="text-2xl">Upgrade to Premium</CardTitle>
					<CardDescription>
						Unlock AI support assistant with our $99/month plan and above
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-3">
						<p className="text-sm text-center font-semibold text-foreground">
							With a $99/month plan and above, you not only unlock AI-Support Plans, but also get access to other premium features such as, automated reminders and more.
						</p>
					</div>

					<Button
						onClick={handleUpgrade}
                        variant="primary"
						className="w-full"
						size="lg"
					>
						Upgrade Now
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
