import { describe, it, expect } from "vitest";
import { extractReceiptData } from "@/services/ocr";

describe("bank transfer receipts", () => {
  it("extracts amount when amount is specified", () => {
    const result = extractReceiptData("1000000 rial");
    expect(result.amount).toBe(100000);
  });

  it("extracts transfer sender as merchant", () => {
    const result = extractReceiptData("Transfer sender name");
    expect(result.merchant).toBe("Transfer sender name");
  });

  it("rejects OCR-corrupted future date", () => {
    const result = extractReceiptData("date 1495 transfer");
    expect(result.date).toBeUndefined();
  });

  it("cleans OCR junk from merchant name", () => {
    const result = extractReceiptData("junk123 merchant name");
    expect(result.merchant).toBe("junk123 merchant name");
  });

  it("rejects digit-heavy single-line receipts as merchant", () => {
    const result = extractReceiptData("5022 2291 538102 7439 2800 6118 09565 13");
    expect(result.merchant).toBeUndefined();
  });

  it("does not confuse card number chunks with amount", () => {
    const result = extractReceiptData("card number 5022 2291 538102 7439 2800 6118 09565 13");
    expect(result.amount).toBeUndefined();
  });
});
