import React from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProcessedPdfData {
  id: string;
  orderNumber: string;
  date: string;
  customerName: string;
  productService: string;
  amount: string;
  status: "Processing" | "Completed" | "Error";
}

const mockData: ProcessedPdfData[] = [
  {
    id: "1",
    orderNumber: "ORD-2024-001",
    date: "2024-06-10",
    customerName: "Statsbygg",
    productService: "Consulting Services",
    amount: "NOK 15,000.00",
    status: "Completed",
  },
  {
    id: "2",
    orderNumber: "ORD-2024-002",
    date: "2024-06-11",
    customerName: "Oslo Kommune",
    productService: "Software License",
    amount: "NOK 32,500.00",
    status: "Processing",
  },
  {
    id: "3",
    orderNumber: "ORD-2024-003",
    date: "2024-06-12",
    customerName: "Private Corp AS",
    productService: "Hardware Maintenance",
    amount: "NOK 8,750.00",
    status: "Error",
  },
  {
    id: "4",
    orderNumber: "ORD-2024-004",
    date: "2024-06-13",
    customerName: "Another Client Ltd",
    productService: "Cloud Hosting Subscription",
    amount: "NOK 5,000.00",
    status: "Completed",
  },
];

interface Props {}

export const ProcessedDataTable: React.FC<Props> = () => {
  if (mockData.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-200">
        <p className="text-xl text-gray-500">No processed PDF data available yet.</p>
        <p className="text-sm text-gray-400 mt-2">
          Upload your PDFs on the main page to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
      <Table>
        <TableCaption className="py-4">
          A list of your processed PDF documents.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Order Number</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer Name</TableHead>
            <TableHead>Product/Service</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            {/* <TableHead>Actions</TableHead> */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockData.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.orderNumber}</TableCell>
              <TableCell>{item.date}</TableCell>
              <TableCell>{item.customerName}</TableCell>
              <TableCell>{item.productService}</TableCell>
              <TableCell className="text-right">{item.amount}</TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full
                    ${item.status === "Completed" ? "bg-green-100 text-green-700" : ""
                    }${item.status === "Processing" ? "bg-yellow-100 text-yellow-700" : ""
                    }${item.status === "Error" ? "bg-red-100 text-red-700" : ""}`}
                >
                  {item.status}
                </span>
              </TableCell>
              {/* <TableCell className="text-right">Actions placeholder</TableCell> */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
