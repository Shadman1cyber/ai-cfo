import { describe, it, expect } from "vitest";
import { extractReceiptData } from "@/services/ocr";

describe("extractReceiptData", () => {
  it("extracts amount from Persian digits", () => {
    const result = extractReceiptData("12345 تومان");
    expect(result.amount).toBe(12345);
  });

  it("extracts amount from Latin digits", () => {
    expect(extractReceiptData("12345").amount).toBe(12345);
  });

  it("converts Rial to Toman", () => {
    expect(extractReceiptData("1500000 rial").amount).toBe(150000);
  });

  it("keeps explicit Toman amounts unchanged", () => {
    expect(extractReceiptData("500000 toman").amount).toBe(500000);
  });

  it("keeps non-bank receipts without unit unchanged", () => {
    expect(extractReceiptData("1250000").amount).toBe(1250000);
  });
});

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
