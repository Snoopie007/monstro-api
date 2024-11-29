import {
	Button,
	Dialog,
	DialogContent,
	DialogTitle,
	DialogHeader,
	DialogClose,
	ScrollArea,
	DialogFooter,
	DialogBody
} from "@/components/ui";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, TimePicker } from "@/components/forms";
import { Input } from "@/components/forms/input";
import { cn, sleep } from "@/libs/utils";
import { Time } from '@internationalized/date';
import { addProgramLevel, updateProgramLevel } from '@/libs/api';
import { useFieldArray, useForm, UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Level, Session } from "@/types";
import { TimeValue } from "react-aria";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/forms/select";
import { toast } from "react-toastify";
import { UpdateLevelsSchema } from "./schemas";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { Icon } from "@/components/icons";


interface UpdateProgramLevelProps {
	level: Level | null;
	onChange: (level: Level | null) => void;
	programId: number;
	locationId: string
}
const DaysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function UpsertLevel({ level, onChange, programId, locationId }: UpdateProgramLevelProps) {
	const { mutate } = useSWR(`/api/protected/${locationId}/programs/`);
	const [loading, setLoading] = useState<boolean>(false);

	const mapScheduleArray = (sessions: Session[]): { day: string, time: TimeValue }[] => {
		const schedules: { day: string, durationTime: number, time: TimeValue }[] = [];

		sessions.forEach((session: Session) => {
			for (const [key, value] of Object.entries(session)) {
				const day = DaysOfWeek.find(d => d.toLowerCase() === key);

				if (day && value !== undefined && typeof value === 'string') {

					const time = value.split(':');
					console.log("Time ", time, time[0], time[1])

					schedules.push({
						day: day,
						durationTime: session.durationTime || 0,
						time: new Time(parseInt(time[0]), parseInt(time[1]))
					});
				}
			}
		});

		return schedules;
	}

	const form = useForm<z.infer<typeof UpdateLevelsSchema>>({
		resolver: zodResolver(UpdateLevelsSchema),
		defaultValues: {
			name: "",
			sessions: [
				{
					day: "",
					time: new Time(12, 0),
					durationTime: 0
				}
			],
			capacity: 0,
			minAge: 0,
			maxAge: 0,

		},
		mode: "onSubmit",
	})

	const { fields, append, remove } = useFieldArray({
		control: form.control, // control props comes from useForm (optional: if you are using FormProvider)
		name: "sessions", // unique name for your Field Array
	});

	useEffect(() => {
		if (level) {
			form.reset({
				...level,
				sessions: mapScheduleArray(level.sessions),
			})
		}
	}, [level])

	async function submitForm(v: z.infer<typeof UpdateLevelsSchema>) {
		console.log(v)
		const sessions = [];
		const session: Session = {};
		setLoading(true);
		// Why do we need this?
		if (level) {
			session["id"] = level.sessions[0].id;
			session["start_date"] = level.sessions[0].startDate;
			session["end_date"] = level.sessions[0].endDate;
		}
		v.sessions.forEach((s) => {
			session[s.day?.toLowerCase()] = s.time?.toString();
		});

		sessions.push(session);
		const body = {
			name: v.name,
			capacity: v.capacity,
			min_age: v.minAge,
			max_age: v.maxAge,
			sessions: sessions,
			program_id: programId
		};
		try {
			if (level && level.id) {
				// Await the updateProgramLevel call
				await updateProgramLevel(level.id, body, locationId);
			} else {
				// Await the addProgramLevel call
				await addProgramLevel(body, locationId);
			}

			onChange(null)
			toast.success("Level Updated Successfully");
			// Call setLevel after the API call is completed
			await sleep(2000)
			setLoading(false);
			await mutate();
		} catch (error) {
			setLoading(false);
			console.error("Error:", error); // Add logging for debugging
			toast.error("Something went wrong, please try again later");
		}
	};
	console.log(!!level)

	return (
		<Dialog open={!!level} onOpenChange={(open) => !open && onChange(null)} >
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{level?.id ? `Update ${level?.name}` : 'Create Level'}
					</DialogTitle>
				</DialogHeader>
				<DialogBody>
					<Form {...form}>
						<form  >
							<fieldset>
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem >
											<FormLabel>Name</FormLabel>
											<FormControl>
												<Input type='text' className={cn()} placeholder={'Level Name'} {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</fieldset>
							<fieldset className='flex flex-row items-center gap-2  w-full'>

								<FormField
									control={form.control}
									name="capacity"
									render={({ field }) => (
										<FormItem >
											<FormLabel>Capacity</FormLabel>
											<FormControl>
												<Input type='number' className={cn()} placeholder={'Capacity'}  {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>

									)}
								/>
								<FormField
									control={form.control}
									name="minAge"
									render={({ field }) => (
										<FormItem className="flex-1">
											<FormLabel >Min Age</FormLabel>
											<FormControl>
												<Input type='number' className={cn()} placeholder={'Min Age'} {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>

									)}
								/>
								<FormField
									control={form.control}
									name="maxAge"
									render={({ field }) => (
										<FormItem className="flex-1">
											<FormLabel >Max Age</FormLabel>
											<FormControl>
												<Input type='number' className={cn()} placeholder={'Max Age'} {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>

									)}
								/>
							</fieldset>
							<fieldset className="bg-foreground/5 rounded-sm mt-4 py-4   ">
								<div className="flex flex-row px-3 items-center justify-between">
									<div className="text-sm  font-medium">Schedules</div>
									<div>
										<Button
											variant={"foreground"}
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												append({ day: "", time: new Time(12, 0), durationTime: 30 });
											}}
											className="text-xs py-1 h-auto rounded-sm"
										>
											+ Add
										</Button>
									</div>
								</div>
								<div className="border-foreground/10 mx-3 h-1 block border-b rounded-sm mt-2 mb-4 "></div>

								<ScrollArea className="h-[250px] w-full px-3  ">
									<div className='inline-flex flex-row items-left gap-2 '>
										{['Day', 'Time', 'Duration(mins)'].map((item) => (
											<div key={item} className={cn('font-medium flex-initial  w-[120px] text-sm')}>
												{item}
											</div>
										))}
									</div>
									{fields.map((field, i) => <SessionComponents form={form} i={i} remove={remove} key={i} />)}
								</ScrollArea>


							</fieldset>

						</form>
					</Form>
				</DialogBody>
				<DialogFooter >
					<DialogClose asChild>
						<Button variant={"outline"} size={"sm"}  >
							Cancel
						</Button>
					</DialogClose>
					<Button type="submit"
						variant={"foreground"}
						size={"sm"}
						className={cn("  children:hidden flex flex-row ", (loading && "children:inline-block"))}
						onClick={form.handleSubmit(submitForm)}
					>
						<Icon name="LoaderCircle" size={14} className="mr-2  animate-spin" />
						Save
					</Button>
				</DialogFooter>
			</DialogContent>

		</Dialog >
	);
}

interface SessionComponentsProps {
	form: UseFormReturn<z.infer<typeof UpdateLevelsSchema>>;
	i: number;

	remove: (index: number) => void;
}

function SessionComponents({ form, i, remove }: SessionComponentsProps) {
	return (

		<div className='inline-flex flex-row items-center gap-2 mb-2' >
			<FormField
				control={form.control}
				name={`sessions.${i}.day`}
				render={({ field }) => (
					<FormItem className='flex-initial w-[120px]'>

						<Select onValueChange={field.onChange} defaultValue={field.value}>
							<SelectTrigger className="w-full border rounded-sm  ">
								<SelectValue placeholder="Select a day" />
							</SelectTrigger>
							<SelectContent>
								{DaysOfWeek.map((day, index) => (
									<SelectItem key={index} value={day}>{day}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name={`sessions.${i}.time`}
				render={({ field }) => (
					<FormItem className='flex-initial w-[120px] '>

						<FormControl>
							<TimePicker
								label="Time"
								value={field.value}
								onChange={(date) => {

									field.onChange(new Time(date.hour, date.minute))
								}}
							/>
						</FormControl>
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name={`sessions.${i}.durationTime`}
				render={({ field }) => (
					<FormItem className="flex-initial w-[120px] ">

						<FormControl>
							<Input type='number' className={cn()} placeholder={'Duration'} {...field} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			{i > 0 ? (
				<div className="flex flex-row items-center gap-2">
					<div>
						<Icon name="Copy" size={16} className="cursor-pointer stroke-gray-500" />
					</div>
					<div onClick={() => remove(i)} >
						<Icon name="Trash2" size={16} className="cursor-pointer stroke-red-500" />
					</div>

				</div>
			) : null}
		</div>
	)
}