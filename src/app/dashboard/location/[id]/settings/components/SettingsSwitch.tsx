import { Switch } from '@/components/ui';
import React, { forwardRef } from 'react';

const SettingsBox = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
    ({ children }, ref) => (
        <div
            ref={ref}
            className='p-4 bg-foreground/5 flex flex-row justify-between items-center rounded-lg'
        >
            {children}
        </div>
    )
);
SettingsBox.displayName = 'SettingsBox';

const SettingContent = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
    ({ children }, ref) => (
        <div ref={ref} className='space-y-1 w-full'>
            {children}
        </div>
    )
);
SettingContent.displayName = 'SettingContent';

const SettingsTitle = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
    ({ children }, ref) => (
        <div ref={ref} className='text-base font-medium'>
            {children}
        </div>
    )
);
SettingsTitle.displayName = 'SettingsTitle';

const SettingsDescription = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
    ({ children }, ref) => (
        <div ref={ref} className='text-sm text-muted-foreground'>
            {children}
        </div>
    )
);
SettingsDescription.displayName = 'SettingsDescription';

export { SettingsBox, SettingContent, SettingsTitle, SettingsDescription };