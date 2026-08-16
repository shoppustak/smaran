import { confirmJob } from "./lib/ingest";
import { db, ingestJobsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function run() {
  const jobId = "20cb6698-e3b4-4b36-99c4-cf4762e73a24";
  const [job] = await db
    .select()
    .from(ingestJobsTable)
    .where(eq(ingestJobsTable.id, jobId))
    .limit(1);
  if (!job) {
    console.log("Job not found!");
    return;
  }
  console.log(`Confirming job ${job.id} for purohit ${job.purohitId}...`);
  try {
    const res = await confirmJob(job.id, job.purohitId);
    console.log("RESULT:", res);
  } catch (err) {
    console.error("ERROR:", err);
  }
}

run().catch(console.error);
