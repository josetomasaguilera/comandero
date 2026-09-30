import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';
import { AdminTablesController } from './admin-tables.controller';
import { TablesService } from '../../../tables/services/tables/tables.service';

jest.mock('../../../tables/services/tables/tables.service', () => ({
  TablesService: class {},
}));

describe('Admin tables', () => {
  const req = { user: { barId: 7 } } as unknown as Request;
  const setup = () => {
    const service = {
      create: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn().mockResolvedValue(null),
    };
    const response = {
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
      redirect: jest.fn(),
    };
    return {
      service,
      response,
      res: response as unknown as Response,
      controller: new AdminTablesController(
        service as unknown as TablesService,
      ),
    };
  };

  it('creates tables using the authenticated bar and trims names', async () => {
    const { controller, service, res, response } = setup();
    await controller.create({ name: ' Mesa 1 ', zone: 'interior' }, req, res);
    expect(service.create).toHaveBeenCalledWith(7, {
      name: 'Mesa 1',
      zone: 'interior',
    });
    expect(response.redirect).toHaveBeenCalledWith('/admin/tables');
  });

  it.each([
    { name: ' ', zone: 'interior' },
    { name: 'Mesa', zone: 'unknown' },
    { name: ['Mesa'], zone: 'interior' },
    { name: 'a'.repeat(101), zone: 'interior' },
  ])('renders invalid form input without saving: %j', async (body) => {
    const { controller, service, res, response } = setup();
    await controller.create(body, req, res);
    expect(service.create).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.render).toHaveBeenCalledWith(
      'admin/tables/form',
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it('rejects administrators without a bar', async () => {
    const { controller, res, service } = setup();
    await expect(
      controller.create(
        { name: 'Mesa', zone: 'interior' },
        { user: {} } as unknown as Request,
        res,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('returns 404 when editing a table outside the current bar', async () => {
    const { controller, service } = setup();
    await expect(controller.edit(42, req)).rejects.toThrow(NotFoundException);
    expect(service.findOne).toHaveBeenCalledWith(42, 7);
  });
});
