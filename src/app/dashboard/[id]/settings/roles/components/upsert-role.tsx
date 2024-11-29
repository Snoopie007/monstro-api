import { Icon } from '@/components/icons';
import {
    Button,
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
    SheetClose,
    Switch,

    ScrollArea,

} from '@/components/ui'
import { Form, FormField, FormLabel, FormItem, FormControl, FormDescription, FormMessage, Input, Checkbox, } from '@/components/forms'
import { cn } from '@/libs/utils';
import React, { useEffect, useState } from 'react';

import { useForm } from 'react-hook-form';
import { PermissionGroup, Role } from '@/types';

type CheckboxVarients = 'red' | 'green' | 'blue' | 'pink' | 'cyan' | 'lime' | 'orange' | 'fuchsia' | 'sky' | 'lemon' | 'purple' | 'yellow'
const RoleColors: CheckboxVarients[] = [
    "red", "green", "blue", "pink", "cyan",
    "lime", "orange", "fuchsia", "sky",
    "lemon", "purple", "yellow"
]

interface UpsertRoleProps {
    role?: Role | null
    permissions: PermissionGroup[]
    onChange: (role: any) => void
}

export function UpsertRole({ role, permissions, onChange }: UpsertRoleProps) {

    const [filteredPermissions, setFilteredPermissions] = useState(permissions)

    const form = useForm()
    useEffect(() => {
        if (!role) return
        form.reset(role)

    }, [role])

    function permissionFilter(query: string) {
        if (query === '') {
            setFilteredPermissions(permissions)
        } else {
            const filtered = permissions.map((group) => {
                return {
                    name: group.name,
                    permissions: group.permissions.filter((permission) => {
                        return permission.name.toLowerCase().includes(query.toLowerCase())
                    })
                }
            })
            setFilteredPermissions(filtered)
        }
    }

    function handleSubmit(data: { [key: string]: any }) {
        console.log(data)
        onChange(data)

    }

    return (
        <Sheet open={!!role} onOpenChange={(open) => !open && onChange(null)}>

            <SheetContent className="w-[30%] p-0 sm:max-w-[30%]">
                <SheetHeader className='p-4'>
                    <SheetTitle>Edit Role {role && `- ${role.name}`}</SheetTitle>
                    <SheetDescription>
                        Edit this role for your organization.
                    </SheetDescription>
                </SheetHeader>
                <div className='border-t p-4 border-foreground/10'>
                    <Form  {...form} >
                        <form>
                            <fieldset className='space-y-4'>
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Role Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="" {...field} />
                                            </FormControl>

                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset className='space-y-4 my-6'>

                                <FormField
                                    control={form.control}
                                    name="color"
                                    render={({ field }) => (
                                        <FormItem>

                                            <div className="mb-4">
                                                <FormLabel >Role Color</FormLabel>
                                                <FormDescription>
                                                    Select the items you want to display in the sidebar.
                                                </FormDescription>
                                            </div>
                                            <div className='flex flex-row gap-1 justify-start'>
                                                {RoleColors && RoleColors.map((color) => (
                                                    <FormControl key={color}>
                                                        <Checkbox
                                                            variant={color}
                                                            className={cn(` h-6 w-6`)}
                                                            checked={field.value === color}
                                                            onCheckedChange={(checked) => {
                                                                field.onChange(color)
                                                            }}
                                                        />
                                                    </FormControl>
                                                ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                            </fieldset>
                            <div className='border-b border-foreground/20 my-4'></div>
                            <fieldset className='bg-foreground/5 rounded-md'>
                                <ScrollArea className='h-[580px] w-full  px-4 py-6 rounded-md '>
                                    <div className='space-y-2 pb-4'>
                                        <div className='text-sm font-medium'>Role Permissions</div>
                                        <div className='relative flex-initial'>
                                            <input
                                                placeholder='Search Permissions'
                                                className='w-full rounded-sm border-foreground text-sm bg-foreground/10  py-2  pl-7 pr-3 '
                                                onChange={(e) => permissionFilter(e.target.value)}
                                            />
                                            <div>
                                                <Icon name="Search" size={15} className="text-gray-400  absolute left-[10px] top-[50%] -translate-y-[51%]" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className='border-b border-foreground/10'></div>
                                    {filteredPermissions.map((group) => (
                                        <React.Fragment key={group.name}>
                                            <div className='uppercase text-xs text-foreground/50 pt-3'>{group.name}</div>
                                            <div>
                                                {group.permissions.map((permission) => (
                                                    <FormField
                                                        key={permission.name}
                                                        control={form.control}
                                                        name={`permissions`}
                                                        render={({ field }) => (
                                                            <FormItem className="flex flex-col border-b py-4 border-foreground/20">
                                                                <div className="flex flex-row items-center justify-between w-full">
                                                                    <FormLabel className="text-sm">
                                                                        {permission.name}
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Switch
                                                                            checked={field.value?.includes(permission.name.toLowerCase())}
                                                                            onCheckedChange={(checked) => {
                                                                                return checked
                                                                                    ? field.onChange([...field.value, permission.name.toLowerCase()])
                                                                                    : field.onChange(
                                                                                        field.value?.filter(
                                                                                            (value: string) => value !== permission.name.toLowerCase()
                                                                                        )
                                                                                    )
                                                                            }}
                                                                            className={cn('data-[state=checked]:bg-green-500')}
                                                                        />
                                                                    </FormControl>
                                                                </div>
                                                                <FormDescription className='text-xs'>
                                                                    {permission.description}
                                                                </FormDescription>
                                                            </FormItem>
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </React.Fragment>
                                    ))}

                                </ScrollArea>

                            </fieldset>
                        </form>
                    </Form>

                </div>
                <SheetFooter className='border-foreground/10 border-t w-full p-4 absolute bottom-0 left-0'>
                    <SheetClose asChild>
                        <Button
                            variant={"outline"}
                            size={"sm"}
                        >
                            Cancel
                        </Button>

                    </SheetClose>
                    <Button
                        variant={"foreground"} type="submit"
                        size={"sm"}
                        onClick={() => {
                            form.handleSubmit(handleSubmit);
                        }}
                    >
                        Save Changes
                    </Button>

                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
