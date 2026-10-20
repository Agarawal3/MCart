
import { auth } from "@/auth";
import uploadOnCloudinary from "@/lib/cloudinary";
import connectDb from "@/lib/db";
import Grocery from "@/models/grocery.model";
import { NextRequest, NextResponse } from "next/server";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_CATEGORIES = [
  "Fruits & Vegetables",
  "Dairy & Eggs",
  "Rice, Atta & Grains",
  "Snacks & Biscuits",
  "Spices & Masalas",
  "Beverages & Drinks",
  "Personal Care",
  "Household Essentials",
  "Instant & Packaged Food",
  "Baby & Pet Care",
];

const ALLOWED_UNITS = [
  "kg",
  "g",
  "liter",
  "ml",
  "piece",
  "pack",
];

export async function POST(req: NextRequest) {
  try {
    // 1. Check login
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { message: "Please login first" },
        { status: 401 }
      );
    }

    // 2. Check admin permission
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { message: "You are not an admin" },
        { status: 403 }
      );
    }

    // 3. Connect to MongoDB
    await connectDb();

    // 4. Read form data
    let formData: FormData;

    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { message: "Invalid form data" },
        { status: 400 }
      );
    }

    const name = formData.get("name");
    const category = formData.get("category");
    const unit = formData.get("unit");
    const price = formData.get("price");
    const file = formData.get("image");

    // 5. Validate required fields
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof category !== "string" ||
      !category.trim() ||
      typeof unit !== "string" ||
      !unit.trim() ||
      typeof price !== "string" ||
      !price.trim()
    ) {
      return NextResponse.json(
        {
          message: "Name, category, unit and price are required",
        },
        { status: 400 }
      );
    }

    // 6. Validate category and unit
    if (!ALLOWED_CATEGORIES.includes(category.trim())) {
      return NextResponse.json(
        { message: "Please select a valid category" },
        { status: 400 }
      );
    }

    if (!ALLOWED_UNITS.includes(unit.trim())) {
      return NextResponse.json(
        { message: "Please select a valid unit" },
        { status: 400 }
      );
    }

    // 7. Validate price
    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return NextResponse.json(
        { message: "Please enter a valid price" },
        { status: 400 }
      );
    }

    // 8. Upload image if provided
    let imageUrl = "";

    if (file instanceof File && file.size > 0) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { message: "Please upload a valid image file" },
          { status: 400 }
        );
      }

      if (file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { message: "Image size must not exceed 5 MB" },
          { status: 400 }
        );
      }

      imageUrl = await uploadOnCloudinary(file);
    } else if (file !== null && !(file instanceof File)) {
      return NextResponse.json(
        { message: "Invalid image file" },
        { status: 400 }
      );
    }

    // 9. Save grocery in MongoDB
    const grocery = await Grocery.create({
      name: name.trim(),
      category: category.trim(),
      unit: unit.trim(),
      price: numericPrice,
      image: imageUrl,
    });

    // 10. Return success response
    return NextResponse.json(
      {
        message: "Grocery added successfully",
        grocery,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("GROCERY ADD ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Unknown server error";

    // Keep detailed errors in the server log.
    // Return a useful but non-sensitive message to the client.
    const isCloudinaryError =
      message.toLowerCase().includes("cloudinary") ||
      message.includes("403") ||
      message.includes("401");

    return NextResponse.json(
      {
        message: isCloudinaryError
          ? "Image upload failed. Please check the image upload configuration."
          : "Failed to add grocery. Please check the server logs.",
      },
      { status: 500 }
    );
  }
}
