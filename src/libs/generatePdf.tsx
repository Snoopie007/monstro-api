import { renderToBuffer } from "@react-pdf/renderer";
import { ContractDocument, ContractData } from "./ContractPdf";

export async function generateContractPdf(data: ContractData) {
  return renderToBuffer(<ContractDocument {...data} />);
}
