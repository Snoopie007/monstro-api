import { MemberCreateAccount, RegistrationHeader } from "./components";

export default async function UserAccountCreation(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    const {
        id
    } = params;

    return (
        <div className="flex h-svh flex-col items-center justify-start">
            <RegistrationHeader >
                Create An Account
            </RegistrationHeader>
            <div className=" text-black w-full max-w-md py-10 ">
                <div className={"mb-10 text-center"}>

                    <p className={"text-base"}>
                        Let's get you started by creating an account. This will allow you to manage your account and access your membership.
                    </p>
                </div>

                <MemberCreateAccount locationId={id} />
            </div>

        </div>
    );
}