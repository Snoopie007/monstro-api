import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Button,
  DropdownMenuSeparator,
} from "@/components/ui";
import { tryCatch } from "@/libs/utils";
import { PaymentMethod } from "@/types";
import { EllipsisVertical } from "lucide-react";

interface PaymentMethodActionsProps {
  paymentMethod: PaymentMethod;
  mid: string;
  lid: string;
}

export default function PaymentMethodsActions({
  paymentMethod,
  mid,
  lid,
}: PaymentMethodActionsProps) {



  async function detach(id: string) {
    const { result, error } = await tryCatch(
      fetch(`/api/protected/loc/${lid}/members/${mid}/pms/${id}`, {
        method: "DELETE",
      })
    );
  }

  async function setDefault(id: string) {
    const { result, error } = await tryCatch(
      fetch(`/api/protected/loc/${lid}/members/${mid}/pms/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          isDefault: true,
        }),
      })
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={"ghost"}
          className="h-auto py-0 px-0 hover:bg-transparent"
        >
          <EllipsisVertical size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[180px] border-foreground/20 p-2">
        {paymentMethod && (
          <>
            <DropdownMenuItem
              className="cursor-pointer hover:bg-indigo-500 text-sm py-2 leading-5"
              onClick={() => setDefault(paymentMethod.stripeId)}
            >
              <span>Default</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="mb-2" />
            <DropdownMenuItem
              className="cursor-pointer bg-red-500 "
              onClick={() => detach(paymentMethod.stripeId)}
            >
              <span>Remove</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
