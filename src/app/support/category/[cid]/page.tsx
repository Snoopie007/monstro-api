export const dynamic = 'auto'
export const fetchCache = 'auto'
import { SupportCategory } from "@/types/admin"
import { notFound } from "next/navigation";
import { SideBar, SingleCategory } from './components';
import { admindb } from "@/db/db";
import { Footer } from "../../components";

async function getSupportCategories(): Promise<SupportCategory[] | undefined> {
    try {
        const categories = await admindb.query.supportCategories.findMany({
            with: {
                metas: true
            }
        });
        return categories;
    } catch (error) {
        console.error(error);
        return undefined;
    }
}


export default async function SupportCategoryPage(props: { params: Promise<{ cid: string }> }) {
    const params = await props.params
    const categories = await getSupportCategories()
    if (!categories) {
        return notFound()
    }

    const category = categories.find((category: SupportCategory) => {

        return category.name.toLocaleLowerCase() === params.cid
    })

    if (!category) {
        return notFound()
    }

    return (
        <>
            <div className="min-h-screen py-6 w-full max-w-6xl m-auto ">
                <section className=' grid grid-cols-6 gap-10'>
                    <div className='col-span-4'>
                        <SingleCategory category={category} />

                    </div>
                    <div className='col-span-2 w-full h-full relative'>
                        {categories && (
                            <SideBar categories={categories} />
                        )}
                    </div>
                </section>
            </div>
            <Footer />
        </>
    )


}

