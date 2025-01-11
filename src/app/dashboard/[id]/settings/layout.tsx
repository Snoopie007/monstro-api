import { ScrollArea } from '@/components/ui/scroll-area';
import SettingMenu from './components/setting-menu';

export default async function SettingsLayout(
    props: {
        children: React.ReactNode;
        params: Promise<{ id: string }>
    }
) {
    const params = await props.params;

    const {
        children
    } = props;

    return (
        <div className=" h-full w-full">
            <ScrollArea className='h-[calc(100vh-50px)]'>
                <div className="max-w-5xl m-auto  ">
                    <section className="mb-6  border-b py-4">
                        <h4 className='text-lg font-bold'>Settings</h4>
                    </section>
                    <section className='grid grid-cols-8 gap-6'>
                        <SettingMenu locationId={params.id} />
                        <div className="col-span-6">
                            {children}
                        </div>
                    </section>
                </div>
            </ScrollArea>
        </div>
    )
}
