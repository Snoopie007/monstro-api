'use client'

import { useEffect, useState } from 'react'
import { BotSettings, TestChatBox } from './components'
import { BotSettingProvider } from './provider'
import { useAccountStatus } from '../../providers'
import { AISupportPaywall } from '@/components/paywall/AISupportPaywall'
import type { SupportAssistant } from '@/types'

export function SupportBotSettingsClient({
	lid,
	assistant,
}: {
	lid: string
	assistant: SupportAssistant | null | undefined
}) {
	const { locationState } = useAccountStatus()
	const isFreePlan = locationState?.planId === 1
	const [showPaywall, setShowPaywall] = useState(false)
	const locationId = locationState?.locationId
	useEffect(() => {
		if (isFreePlan) {
			// Show paywall after a brief delay for visibility
			const timer = setTimeout(() => {
				setShowPaywall(true)
			}, 500)
			return () => clearTimeout(timer)
		}
	}, [isFreePlan])

	return (
		<div className="relative">
			<div className="flex flex-row h-[calc(100vh-58px)] p-2 gap-2 overflow-hidden">
				<BotSettingProvider assistant={assistant} locationId={locationId}>
					<div className="w-1/3 min-w-0">
						<BotSettings lid={lid} />
					</div>
					<div className="w-2/3 min-w-0">
						<TestChatBox lid={lid} />
					</div>
				</BotSettingProvider>
			</div>

			{/* Paywall Overlay */}
			{isFreePlan && (
				<div
					className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center transition-opacity duration-500 ${
						showPaywall ? 'opacity-100' : 'opacity-0 pointer-events-none'
					}`}
					style={{
						zIndex: 9999,
					}}
				>
					<div
						className={`rounded-lg max-w-2xl w-full mx-4 transition-all duration-500 transform ${
							showPaywall
								? 'scale-100 opacity-100'
								: 'scale-95 opacity-0'
						}`}
					>
						<AISupportPaywall />
					</div>
				</div>
			)}
		</div>
	)
}
