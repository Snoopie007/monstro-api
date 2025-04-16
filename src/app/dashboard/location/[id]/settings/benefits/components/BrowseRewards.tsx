import React from 'react'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Button, DialogDescription } from '@/components/ui'

export default function BrowseRewards() {
    return (
        <Dialog>
            <DialogTrigger>
                <Button variant="foreground" size="xs">Browse Rewards</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Browse Rewards</DialogTitle>
                    <DialogDescription>Browse through all the rewards available to you.</DialogDescription>
                </DialogHeader>
                <div>

                </div>
            </DialogContent>
        </Dialog>
    )
}
