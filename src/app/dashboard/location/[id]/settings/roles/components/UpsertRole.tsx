
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
import { cn, tryCatch } from '@/libs/utils';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { Permission, Role } from '@subtrees/types';
import { CreateRoleSchema } from '../schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, SearchIcon } from 'lucide-react';

type CheckboxVarients = 'red' | 'green' | 'blue' | 'pink' | 'cyan' | 'lime' | 'orange' | 'fuchsia' | 'sky' | 'lemon' | 'purple' | 'yellow'
const RoleColors: CheckboxVarients[] = [
    "red", "green", "blue", "pink", "cyan",
    "lime", "orange", "fuchsia", "sky",
    "lemon", "purple", "yellow"
]

interface UpsertRoleProps {
    role?: Partial<Role> | null
    permissions: Array<Permission>,
    setCurrentRole: Function,
    locationId: string,
    onSave: () => void
}

export function UpsertRole({ role, permissions, setCurrentRole, locationId, onSave }: UpsertRoleProps) {
    const [filteredPermissions, setFilteredPermissions] = useState<Array<Permission>>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const form = useForm<z.infer<typeof CreateRoleSchema>>({
        resolver: zodResolver(CreateRoleSchema),
        defaultValues: {
            name: "",
            color: "red",
            permissions: []
        },
        mode: "onChange",
    });

    useEffect(() => {
        setFilteredPermissions(permissions);
        if (role) {
            const ids = role.permissions?.map((permission: any) => permission.permissionId);

            const permissionNames = permissions.filter((permission: Permission) => ids?.includes(permission.id)).map((permission) => permission.name);
            form.reset({
                name: role.name,
                color: role.color || 'blue',
                permissions: permissionNames
            });
        }
    }, [role, permissions]);

    function permissionFilter(query: string) {
        if (query === '') {
            setFilteredPermissions(permissions); // Show all permissions if query is empty
        } else {
            const filtered = permissions.filter((permission) =>
                permission.name.toLowerCase().includes(query.toLowerCase())
            );
            setFilteredPermissions(filtered); // Update the state with filtered permissions
        }
    }

    async function handleSubmit(v: z.infer<typeof CreateRoleSchema>) {
        setIsSubmitting(true)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${locationId}/roles${role && role.id ? `/${role.id}` : ''}`, {
                method: role && role.id ? 'PUT' : 'POST',
                body: JSON.stringify(v)
            })
        )
        if (error || !result || !result.ok) {
            toast.error("Something went wrong, please try again later");
        }
        toast.success("Role Updated");
        form.reset();
        setCurrentRole(null);
        onSave();
        setIsSubmitting(false)
    };

    return (
        <Sheet open={!!role} onOpenChange={(open) => {
            if (!open) {
                setCurrentRole(null);
            }
        }}>

            <SheetContent className="w-[30%] p-0 sm:max-w-[30%]">
                <SheetHeader className='p-4'>
                    <SheetTitle>Edit Role {role && `- ${role.name}`}</SheetTitle>
                    <SheetDescription>
                        Edit this role for your organization.
                    </SheetDescription>
                </SheetHeader>
                <div className='border-t p-4 border-foreground/10'>
                    <Form  {...form} >
                        <form className='space-y-4'>
                            <fieldset className='space-y-4'>
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size="tiny">Role Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter role name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </fieldset>
                            <fieldset className='space-y-1'>
                                <FormField
                                    control={form.control}
                                    name="color"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel size="tiny">Role Color</FormLabel>
                                            <div className='flex flex-row gap-1 justify-start'>
                                                {RoleColors && RoleColors.map((color) => (
                                                    <FormControl key={color}>
                                                        <Checkbox
                                                            variant={color}
                                                            className={cn(`h-6 w-6`)}
                                                            checked={field.value === color}
                                                            onCheckedChange={(checked) => {
                                                                console.log(color)
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
                                        <Input placeholder='Search Permissions' onChange={(e) => permissionFilter(e.target.value)} />
                                    </div>
                                    <div className='border-b border-foreground/10'></div>
                                    {filteredPermissions.map((permission) => (
                                        <React.Fragment key={permission.name.replace(' ', '_')}>
                                            <div>
                                                <FormField
                                                    key={permission.name}
                                                    control={form.control}
                                                    name="permissions"
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
                                                                            console.log(field.value)
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
                        <Button variant={"outline"} size={"sm"} disabled={isSubmitting}>
                            Cancel
                        </Button>

                    </SheetClose>
                    <Button
                        variant={"foreground"} type="submit"
                        size={"sm"}
                        onClick={
                            form.handleSubmit(handleSubmit)
                        }
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet >
    )
}
