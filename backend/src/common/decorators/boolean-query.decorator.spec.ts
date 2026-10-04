import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BooleanQuery, parseBooleanQuery } from './boolean-query.decorator.js';

class Query {
  @BooleanQuery()
  flag?: boolean;
}

const parse = async (flag: unknown) => {
  const dto = plainToInstance(Query, flag === undefined ? {} : { flag });
  return {
    value: dto.flag,
    errors: (await validate(dto)).map((e) => e.property),
  };
};

describe('BooleanQuery', () => {
  it.each([
    ['true', true],
    ['1', true],
    ['false', false],
    ['0', false],
  ])('parses %s as %s', async (raw, expected) => {
    expect(await parse(raw)).toEqual({ value: expected, errors: [] });
  });

  it('leaves a missing or empty value undefined', async () => {
    expect(await parse(undefined)).toEqual({ value: undefined, errors: [] });
    expect(parseBooleanQuery('')).toBeUndefined();
  });

  it('rejects anything else', async () => {
    for (const raw of ['yes', 'False ', 'TRUE', '2'])
      expect((await parse(raw)).errors).toEqual(['flag']);
  });
});
