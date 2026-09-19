import "dotenv/config";
import express, { type Request, type Response } from "express";
import { createServer } from "http";
import { ObjectId } from "mongodb";
import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "./db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function toFiniteNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const normalized = value.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  if (!normalized) return null;

  const number = Number(normalized[0]);
  return Number.isFinite(number) ? number : null;
}

function getProductPrice(product: Record<string, unknown>) {
  const priceFieldNames = [
    "price",
    "Price",
    "unitPrice",
    "unitprice",
    "UnitPrice",
    "unit_price",
    "Unit Price",
    "unit price",
    "sellingPrice",
    "sellingprice",
    "SellingPrice",
    "selling_price",
    "Selling Price",
    "selling price",
    "salePrice",
    "SalePrice",
    "sale_price",
    "MRP",
    "mrp",
    "rate",
    "Rate",
  ];

  for (const fieldName of priceFieldNames) {
    const price = toFiniteNumber(product[fieldName]);
    if (price !== null) return price;
  }

  return null;
}

function serializeProduct(product: Record<string, unknown> | null) {
  if (!product) return product;

  const price = getProductPrice(product);
  return {
    ...product,
    price,
  };
}

function getOwnerId(req: Request, res: Response) {
  const ownerId = String(req.headers["x-owner-id"] || "").trim();

  if (!ownerId) {
    res.status(401).json({ error: "Signed-in account id is required" });
    return null;
  }

  return ownerId;
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  app.get("/api/health", async (_req, res) => {
    try {
      await getDb();
      res.json({ ok: true, database: "connected" });
    } catch (error) {
      res.status(503).json({ ok: false, error: error instanceof Error ? error.message : "Database unavailable" });
    }
  });

  app.get("/api/products", async (req, res) => {
    try {
      const ownerId = getOwnerId(req, res);
      if (!ownerId) return;

      const db = await getDb();
      const products = await db.collection("products").find({ ownerId }).sort({ name: 1 }).toArray();
      res.json({ products: products.map(serializeProduct) });
    } catch (error) {
      res.status(503).json({ error: error instanceof Error ? error.message : "Could not load products" });
    }
  });

  app.get("/api/transactions", async (req, res) => {
    try {
      const ownerId = getOwnerId(req, res);
      if (!ownerId) return;

      const db = await getDb();
      const transactions = await db.collection("transactions").find({ ownerId }).sort({ createdAt: -1 }).limit(50).toArray();
      res.json({ transactions });
    } catch (error) {
      res.status(503).json({ error: error instanceof Error ? error.message : "Could not load transactions" });
    }
  });

  app.patch("/api/products/:id/price", async (req, res) => {
    try {
      const ownerId = getOwnerId(req, res);
      if (!ownerId) return;

      const { id } = req.params;
      const price = Number(req.body?.price);

      if (!ObjectId.isValid(id)) {
        res.status(400).json({ error: "Valid product id is required" });
        return;
      }

      if (!Number.isFinite(price) || price < 0) {
        res.status(400).json({ error: "A valid price is required" });
        return;
      }

      const db = await getDb();
      const products = db.collection("products");
      const _id = new ObjectId(id);
      const result = await products.updateOne({ _id, ownerId }, { $set: { price, updatedAt: new Date() } });

      if (!result.matchedCount) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      const product = await products.findOne({ _id, ownerId });
      res.json({ product: serializeProduct(product) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Could not update price" });
    }
  });

  app.patch("/api/products/by-name/:name/price", async (req, res) => {
    try {
      const ownerId = getOwnerId(req, res);
      if (!ownerId) return;

      const productName = decodeURIComponent(req.params.name).trim();
      const price = toFiniteNumber(req.body?.price);

      if (!productName) {
        res.status(400).json({ error: "Product name is required" });
        return;
      }

      if (price === null || price < 0) {
        res.status(400).json({ error: "A valid price is required" });
        return;
      }

      const db = await getDb();
      const products = db.collection("products");
      const productNameFilter = new RegExp(`^${productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      const result = await products.updateOne(
        { ownerId, name: productNameFilter },
        { $set: { price, updatedAt: new Date() } }
      );

      if (!result.matchedCount) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      const product = await products.findOne({ ownerId, name: productNameFilter });
      res.json({ product: serializeProduct(product) });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Could not update price" });
    }
  });

  app.post("/api/stock-events", async (req, res) => {
    try {
      const ownerId = getOwnerId(req, res);
      if (!ownerId) return;

      const { productName, quantity, type, unit, reorder, price } = req.body as {
        productName?: string;
        quantity?: number | string;
        type?: "add" | "remove";
        unit?: string;
        reorder?: number | string;
        price?: number | string;
      };
      const stockQuantity = toFiniteNumber(quantity);
      const productPrice = toFiniteNumber(price);
      const reorderLevel = toFiniteNumber(reorder);

      if (!productName || !stockQuantity || stockQuantity < 1 || !["add", "remove"].includes(type || "")) {
        res.status(400).json({ error: "productName, quantity, and type are required" });
        return;
      }

      const db = await getDb();
      const products = db.collection("products");
      const transactions = db.collection("transactions");
      const product = await products.findOne({ ownerId, name: productName });

      if (!product && type === "add") {
        const now = new Date();
        const productUnit = unit?.trim() || "units";
        const productReorder = reorderLevel !== null && reorderLevel >= 0 ? reorderLevel : 5;
        const unitPrice = productPrice !== null && productPrice >= 0 ? productPrice : 0;
        const newProduct = {
          ownerId,
          name: productName,
          icon: productName.slice(0, 2).toUpperCase(),
          stock: stockQuantity,
          unit: productUnit,
          reorder: productReorder,
          price: unitPrice,
          tint: "#eef4e6",
          accent: "#6b8b38",
          createdAt: now,
          updatedAt: now,
        };

        const insertResult = await products.insertOne(newProduct);
        const createdProduct = await products.findOne({ _id: insertResult.insertedId, ownerId });

        await transactions.insertOne({
          type,
          ownerId,
          product: productName,
          quantity: stockQuantity,
          unit: newProduct.unit,
          price: unitPrice,
          amount: unitPrice * stockQuantity,
          actor: "You",
          createdAt: now,
        });

        const latestTransactions = await transactions.find({ ownerId }).sort({ createdAt: -1 }).limit(50).toArray();
        res.status(201).json({ product: serializeProduct(createdProduct), transactions: latestTransactions });
        return;
      }

      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      if (type === "remove" && product.stock < stockQuantity) {
        res.status(400).json({ error: `Only ${product.stock} ${product.unit} available` });
        return;
      }

      const stockChange = type === "remove" ? -stockQuantity : stockQuantity;
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (type === "add" && productPrice !== null && productPrice >= 0) {
        updates.price = productPrice;
      }
      await products.updateOne({ _id: product._id, ownerId }, { $inc: { stock: stockChange }, $set: updates });

      const transactionPrice = productPrice ?? getProductPrice(product) ?? 0;
      await transactions.insertOne({
        type,
        ownerId,
        product: product.name,
        quantity: stockQuantity,
        unit: product.unit,
        price: transactionPrice,
        amount: transactionPrice * stockQuantity,
        actor: "You",
        createdAt: new Date(),
      });

      const updatedProduct = await products.findOne({ _id: product._id, ownerId });
      const latestTransactions = await transactions.find({ ownerId }).sort({ createdAt: -1 }).limit(50).toArray();

      res.json({ product: serializeProduct(updatedProduct), transactions: latestTransactions });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Could not update stock" });
    }
  });

  app.post("/api/customer-purchases/checkout", async (req, res) => {
    try {
      const ownerId = getOwnerId(req, res);
      if (!ownerId) return;

      const { items } = req.body as {
        items?: Array<{ productName?: string; quantity?: number | string }>;
      };

      if (!Array.isArray(items) || !items.length) {
        res.status(400).json({ error: "At least one purchase item is required" });
        return;
      }

      const db = await getDb();
      const products = db.collection("products");
      const transactions = db.collection("transactions");
      const now = new Date();
      const normalizedItems = Array.from(items.reduce((combined, item) => {
        const productName = item.productName?.trim();
        const quantity = toFiniteNumber(item.quantity);
        if (!productName) return combined;

        const key = productName.toLowerCase();
        const existing = combined.get(key);
        combined.set(key, {
          productName: existing?.productName || productName,
          quantity: (existing?.quantity || 0) + (quantity || 0),
        });
        return combined;
      }, new Map<string, { productName: string; quantity: number }>()).values());
      const billLines: Array<{ productName: string; quantity: number; unit: string; price: number; amount: number }> = [];

      for (const item of normalizedItems) {
        if (!item.productName || !Number.isFinite(item.quantity) || item.quantity <= 0) {
          res.status(400).json({ error: "Each purchase item needs a productName and quantity" });
          return;
        }

        const product = await products.findOne({ ownerId, name: item.productName });
        if (!product) {
          res.status(404).json({ error: `${item.productName} was not found in inventory` });
          return;
        }

        if (product.stock < item.quantity) {
          res.status(400).json({ error: `Only ${product.stock} ${product.unit} of ${product.name} available` });
          return;
        }

        const price = getProductPrice(product);
        if (price === null || price < 0) {
          res.status(400).json({ error: `${product.name} does not have a valid price` });
          return;
        }

        billLines.push({
          productName: product.name,
          quantity: item.quantity,
          unit: product.unit,
          price,
          amount: price * item.quantity,
        });
      }

      for (const item of normalizedItems) {
        const product = await products.findOne({ ownerId, name: item.productName });
        if (!product) continue;
        const price = getProductPrice(product) ?? 0;

        await products.updateOne({ _id: product._id, ownerId }, { $inc: { stock: -item.quantity }, $set: { updatedAt: now } });
        await transactions.insertOne({
          type: "remove",
          ownerId,
          product: product.name,
          quantity: item.quantity,
          unit: product.unit,
          price,
          amount: price * item.quantity,
          actor: "Customer purchase",
          createdAt: now,
        });
      }

      const updatedProducts = await products.find({ ownerId }).sort({ name: 1 }).toArray();
      const latestTransactions = await transactions.find({ ownerId }).sort({ createdAt: -1 }).limit(50).toArray();
      const totalAmount = billLines.reduce((sum, line) => sum + line.amount, 0);

      res.json({ products: updatedProducts.map(serializeProduct), transactions: latestTransactions, bill: { items: billLines, totalAmount } });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Could not complete purchase" });
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || (process.env.NODE_ENV === "production" ? 3000 : 3001);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
