'use client';
import { use, useState } from "react";

import { usePrograms } from '@/hooks/use-programs';
import { AddProgram, ProgramList } from './components';
import ErrorComponent from '@/components/error';
import SectionLoader from '@/components/section-loading';
import { Program } from "@/types";
import { TablePage, TablePageHeaderTitle, TablePageHeader, TablePageHeaderSection, TablePageContent, TablePageFooter } from "@/components/ui";
import Loading from "@/components/loading";


export default function Programs(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { data, isLoading, error } = usePrograms(params.id);
    const [searchQuery, setSearchQuery] = useState<string>("");

    if (error) {
        return (
            <ErrorComponent error={error} />
        );
    }

    // Filter programs based on the search query
    const filteredPrograms = data?.filter((program: Program) =>
        program.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <TablePage>
            <TablePageHeader>
                <TablePageHeaderTitle>Programs</TablePageHeaderTitle>
                <TablePageHeaderSection>
                    <input
                        placeholder='Search programs'
                        className='text-xs bg-transparent py-1 px-2 rounded-xs border'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <AddProgram locationId={params.id} />
                </TablePageHeaderSection>
            </TablePageHeader>
            <TablePageContent>
                {isLoading ? (
                    <Loading />
                ) : (
                    <ProgramList programs={filteredPrograms} locationId={params.id} />
                )}
            </TablePageContent>
            <TablePageFooter>
                <p className="p-2">
                    {filteredPrograms?.length} programs found
                </p>
            </TablePageFooter>
        </TablePage>

    );
}
