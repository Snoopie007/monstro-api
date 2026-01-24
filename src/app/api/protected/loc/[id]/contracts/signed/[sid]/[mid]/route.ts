import { NextResponse, NextRequest } from "next/server";
import { memberContracts } from "@/db/schemas";
import { db } from "@/db/db";
import { and, eq } from "drizzle-orm";
import { auth } from "@/libs/auth/server";
import { generateContractPdf } from "@/libs/generatePdf";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string; sid: string; mid: string }> }
) {
  const params = await props.params;
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const mb = await db.query.memberContracts.findFirst({
      where: and(
        eq(memberContracts.id, params.sid),
        eq(memberContracts.memberId, params.mid)
      ),
      with: {
        location: true,
      },
    });

    if (!mb) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    const { location, ...contract } = mb;

    // Generate PDF directly with react-pdf
    const pdfBuffer = await generateContractPdf({
      contract: {
        ...contract,
        variables: {
          contact: {
            firstName: session.user.name.split(" ")[0],
            lastName: session.user.name.split(" ")[1] || "",
            email: session.user.email,
            phone: session.user.phone || "",
          },
          location: location,
        },
      },
      memberName: session.user.name,
      date: new Date(mb.created).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      contractId: contract.id,
    });

    // Create response with PDF
    const response = new NextResponse(pdfBuffer.toString());
    response.headers.set("Content-Type", "application/pdf");
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="contract_${contract.id}.pdf"`
    );

    return response;
  } catch (err) {
    console.error("Contract download error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to download contract",
        details: process.env.NODE_ENV === "development" ? err : undefined,
      },
      { status: 500 }
    );
  }
}
