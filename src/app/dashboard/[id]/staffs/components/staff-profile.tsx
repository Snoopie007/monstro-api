import { Icon } from '@/components/icons';
import {
    Button,
    Dialog,
    DialogContent,
    Avatar,
    AvatarImage,
    AvatarFallback,
    Badge,
} from '@/components/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/libs/utils'
import { Staff } from '@/types';


interface StaffListProps {
    staff?: Staff | null
    onChange: (staff: any) => void
}

export function StaffProfile({ staff, onChange }: StaffListProps) {
    const handleSave = () => {
        onChange(staff)
    }
    return (
        <Dialog open={!!staff} onOpenChange={(open) => !open && onChange(null)}>

            <DialogContent className={cn("border-foreground/10 py-4 px-3 sm:max-w-[650px]")}>
                <div className='space-y-4'>
                    <div className="flex flex-row items-start py-4 gap-5">
                        <div className="flex-initial relative">
                            <Avatar className="w-24 h-24 rounded-full mx-auto">
                                <AvatarImage src={staff?.image} />
                                <AvatarFallback className="text-4xl uppercase text-muted bg-foreground font-medium">
                                </AvatarFallback>
                            </Avatar>


                        </div>
                        <div className='space-y-1.5'>
                            <b className='text-xl font-bold'>{staff?.name}</b>
                            <div className='flex-row flex items-center gap-2 text-sm'>
                                <div className='flex-row flex items-center gap-1'>
                                    <Icon name='Mail' size={14} />
                                    <span>{staff?.email}</span>
                                </div>
                                <div className='flex-row flex items-center gap-1'>
                                    <Icon name='Phone' size={14} />
                                    <span>{staff?.phone}</span>
                                </div>
                            </div>
                            <div className='flex flex-row items-center gap-2 text-sm'>
                                <Badge className='border-0 inline-flex flex-row items-center gap-1 py-0.5 rounded-sm'>
                                    <span>  {staff?.role.name}</span>
                                    <Icon name='ChevronDown' size={14} />
                                </Badge>
                                <div className='text-indigo-400 cursor-pointer'>
                                    Reset password
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='bg-foreground/5 p-4 rounded-md'>
                        <Tabs defaultValue="account" className="w-full">
                            <TabsList className='bg-transparent p-0 gap-4 w-full justify-start rounded-none border-foreground/10'>
                                <TabsTrigger value="account" className='px-0  data-[state=active]:bg-transparent data-[state=active]:border-b-2 rounded-none'>Account</TabsTrigger>
                                <TabsTrigger value="schedules" className='px-0  data-[state=active]:bg-transparent data-[state=active]:border-b-2 rounded-none'>Schedules</TabsTrigger>
                            </TabsList>
                            <div className='border-t border-foreground/10 -mt-1'></div>
                            <TabsContent value="account" className='py-5'>Make changes to your account here.</TabsContent>
                            <TabsContent value="schedules" className='py-5'>Coming Soon.</TabsContent>
                        </Tabs>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
