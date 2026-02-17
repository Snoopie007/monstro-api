import { NextResponse } from "next/server";

const DEPRECATION_MESSAGE = "This legacy subscription mutation route is retired. Use monstro-api x/loc subscription endpoints instead.";

function retiredResponse() {
  return NextResponse.json(
    {
      error: DEPRECATION_MESSAGE,
      deprecated: true,
      replacement: {
        pause: "POST /x/loc/:lid/subscriptions/:sid/pause",
        resume: "POST /x/loc/:lid/subscriptions/:sid/resume",
        update: "PATCH /x/loc/:lid/subscriptions/:sid",
        cancel: "POST /x/loc/:lid/subscriptions/:sid/cancel",
      },
    },
    { status: 410 }
  );
}

export async function PUT() {
  return retiredResponse();
}

export async function PATCH() {
  return retiredResponse();
}

export async function DELETE() {
  return retiredResponse();
}
