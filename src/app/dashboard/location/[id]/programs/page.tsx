"use client";
import { use, useMemo, useState } from "react";

import { usePrograms } from "@/hooks/usePrograms";
import { AddProgram } from "./components";
import ErrorComponent from "@/components/error";
import { Program } from "@/types";
import Loading from "@/components/loading";
import { Input } from "@/components/forms/input";
import { usePermission } from "@/hooks/usePermissions";
import { ProgramItem } from "./components";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Skeleton } from "@/components/ui/skeleton";

export default function Programs(props: { params: Promise<{ id: string }> }) {
	const params = use(props.params);
	const { programs, isLoading, error, mutate } = usePrograms(params.id);
	const canAddProgram = usePermission("add program", params.id);
	const refetchPrograms = () => mutate();

	const [searchQuery, setSearchQuery] = useState<string>("");
	const filteredPrograms = useMemo(() => {
		if (searchQuery.length > 0 && programs) {
			return programs.filter((program: Program) =>
				program.name.toLowerCase().includes(searchQuery.toLowerCase())
			);
		}
		return programs;
	}, [programs, searchQuery]);


	if (error) return <ErrorComponent error={error} />;
	if (isLoading) return <Loading />;
	// Filter programs based on the search query


	return (
		<div className="flex flex-col gap-4">
			<ScrollArea className="h-[calc(100vh-52px)] w-full ">

				<div className="max-w-6xl mx-auto w-full space-y-4">
					<div className="flex flex-row items-center gap-2 justify-between">
						<Input
							placeholder="Find a program..."
							value={searchQuery}
							className="h-10 bg-foreground/5 rounded-lg w-[300px]"
							onChange={(e) => setSearchQuery(e.target.value)}
							variant="search"
						/>
						{canAddProgram && <AddProgram lid={params.id} />}

					</div>

					{isLoading && (
						<div>
							<Skeleton className="h-10 w-full rounded-lg border border-foreground/5" />
							<Skeleton className="h-10 w-full rounded-lg border border-foreground/5" />
						</div>
					)}
					<div className="space-y-2 pb-10">


						{filteredPrograms?.map((program) => (
							<ProgramItem key={program.id} program={program} onDeleted={refetchPrograms} />
						))}


					</div>
				</div>
			</ScrollArea>
		</div >
	)
}

