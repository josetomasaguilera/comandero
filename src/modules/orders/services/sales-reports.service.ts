import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from '../entities/order.schema';

const timeZone = 'Europe/Madrid';
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
});

export function salesDate(date: Date): string {
  const parts = dateFormatter.formatToParts(date);
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type)!.value).join('-');
}

@Injectable()
export class SalesReportsService {
  constructor(@InjectModel(Order.name) private readonly orders: Model<Order>) {}

  async monthly(barId: number, selected: unknown, now = new Date()) {
    const currentMonth = salesDate(now).slice(0, 7);
    const month = selected === undefined ? currentMonth : selected;
    if (typeof month !== 'string' || !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new BadRequestException('Selecciona un mes válido');
    }
    const [year, monthNumber] = month.split('-').map(Number);
    // The wider UTC window covers Madrid midnight in both winter and summer.
    // Exact month membership is checked below in the same timezone as the report.
    const from = new Date(Date.UTC(year, monthNumber - 1, 0));
    const to = new Date(Date.UTC(year, monthNumber, 2));
    const [available, orders] = await Promise.all([
      this.orders.aggregate<{ _id: string }>([
        { $match: { barId, status: 'cerrado', closedAt: { $type: 'date' } } },
        { $group: { _id: { $dateToString: { date: '$closedAt', format: '%Y-%m', timezone: timeZone } } } },
        { $sort: { _id: -1 } },
      ]).exec(),
      this.orders.find({ barId, status: 'cerrado', closedAt: { $gte: from, $lt: to } })
        .populate({ path: 'items', match: { barId }, populate: { path: 'product', match: { barId } } })
        .lean().exec(),
    ]);
    const days = Array.from({ length: new Date(Date.UTC(year, monthNumber, 0)).getUTCDate() }, (_, index) => ({
      date: `${String(index + 1).padStart(2, '0')}/${String(monthNumber).padStart(2, '0')}/${year}`,
      orders: 0, totalCents: 0,
    }));
    const products = new Map<number, { id: number; name: string; quantity: number; totalCents: number }>();
    let estimated = false;
    let missingPrices = false;
    let orderCount = 0;
    for (const order of orders) {
      if (!order.closedAt) continue;
      const date = salesDate(new Date(order.closedAt));
      if (!date.startsWith(`${month}-`)) continue;
      const day = days[Number(date.slice(8)) - 1];
      day.orders++;
      orderCount++;
      for (const item of order.items ?? []) {
        const historical = item.saleUnitPriceCents != null;
        if (!historical) estimated = true;
        if (!historical && !item.product) missingPrices = true;
        const unitCents = item.saleUnitPriceCents ?? (Math.round(Number(item.product?.price ?? 0) * 100) + (item.extrasCents ?? 0));
        const totalCents = unitCents * item.quantity;
        day.totalCents += totalCents;
        const product = products.get(item.productId) ?? {
          id: item.productId,
          name: item.saleProductName ?? item.product?.name ?? `Producto eliminado #${item.productId}`,
          quantity: 0, totalCents: 0,
        };
        product.quantity += item.quantity;
        product.totalCents += totalCents;
        products.set(item.productId, product);
      }
    }
    const monthLabel = (value: string) => new Intl.DateTimeFormat('es-ES', {
      month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(`${value}-01T12:00:00Z`));
    return {
      month,
      monthLabel: monthLabel(month),
      months: [...new Set([currentMonth, month, ...available.map((row) => row._id)])].sort().reverse()
        .map((value) => ({ value, label: monthLabel(value), selected: value === month })),
      days,
      products: [...products.values()].sort((a, b) => b.totalCents - a.totalCents || a.name.localeCompare(b.name, 'es')),
      totalCents: days.reduce((sum, day) => sum + day.totalCents, 0),
      quantity: [...products.values()].reduce((sum, product) => sum + product.quantity, 0),
      orderCount, estimated, missingPrices,
    };
  }
}
