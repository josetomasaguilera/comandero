import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Product } from '../../../products/entities/product.entity';
import { Table } from '../../../tables/entities/table.entity';

type VoiceOrderInterpretation = {
  tableId: number;
  items: { productId: number; quantity: number; notes: string }[];
  unmatched: string[];
};

@Injectable()
export class VoiceOrderService {
  constructor(private readonly config: ConfigService) {}

  async interpret(
    transcript: string,
    products: Product[],
    tables: Table[],
  ): Promise<VoiceOrderInterpretation> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'El reconocimiento inteligente no está configurado',
      );
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.get<string>('OPENAI_VOICE_ORDER_MODEL') ?? 'gpt-5.4',
        store: false,
        instructions:
          'Interpreta una comanda hablada en español. Usa exclusivamente los IDs de la carta proporcionada. ' +
          'Reconoce sinónimos, plurales, diminutivos y errores leves de transcripción. ' +
          'Nunca inventes productos. Si algo no se corresponde de forma fiable con la carta, inclúyelo en unmatched. ' +
          'Para cada producto reconocido, pon en notes cualquier detalle o parte de la comanda que no añada otro producto, ' +
          'por ejemplo “sin lactosa”, “con hielo” o “muy hecho”. Usa una cadena vacía si no hay notas. ' +
          'Si la comanda indica una mesa, devuelve su ID usando la lista de mesas. Si no indica ninguna mesa, devuelve tableId 0. ' +
          'Las cantidades deben ser enteros positivos entre 1 y 20.',
        input: JSON.stringify({
          transcript,
          products: products.map((product) => ({ id: product.id, name: product.name })),
          tables: tables.map((table) => ({ id: table.id, name: table.name })),
        }),
        text: {
          format: {
            type: 'json_schema',
            name: 'voice_order',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                tableId: { type: 'integer' },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      productId: { type: 'integer' },
                      quantity: { type: 'integer', minimum: 1, maximum: 20 },
                      notes: { type: 'string', maxLength: 250 },
                    },
                    required: ['productId', 'quantity', 'notes'],
                  },
                },
                unmatched: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['tableId', 'items', 'unmatched'],
            },
          },
        },
      }),
    });
    console.log(response);

    if (!response.ok) {
      throw new ServiceUnavailableException(
        'No se ha podido interpretar el pedido por voz',
      );
    }

    const payload = (await response.json()) as {
      output_text?: string;
      output?: { content?: { type: string; text?: string }[] }[];
    };
    const outputText =
      payload.output_text ??
      payload.output
        ?.flatMap((item) => item.content ?? [])
        .find((content) => content.type === 'output_text')?.text;
    if (!outputText) {
      throw new ServiceUnavailableException(
        'La interpretación de voz no ha devuelto un resultado válido',
      );
    }

    try {
      return JSON.parse(outputText) as VoiceOrderInterpretation;
    } catch {
      throw new ServiceUnavailableException(
        'La interpretación de voz no ha devuelto un resultado válido',
      );
    }
  }
}
