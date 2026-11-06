import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

type CardFormat = 'card' | 'og' | 'story';

const fontFile = (weight: number) =>
  path.join(process.cwd(), 'node_modules/@fontsource/bitter/files', `bitter-latin-${weight}-normal.woff`);

let fonts: any[] | null = null;

const h = (type: string, style: any, children?: any) => ({ type, props: { style, children } });

export async function renderCard(o: {
  headline: string;
  signLine: string;
  format?: CardFormat;
}) {
  const { default: satori } = await import('satori');
  fonts ??= [
    { name: 'Bitter', data: fs.readFileSync(fontFile(400)), weight: 400, style: 'normal' },
    { name: 'Bitter', data: fs.readFileSync(fontFile(700)), weight: 700, style: 'normal' },
  ];

  const format = o.format ?? 'card';
  const story = format === 'story';
  const landscape = format === 'og';
  const width = story ? 1080 : landscape ? 1200 : 700;
  const height = story ? 1920 : landscape ? 630 : 980;
  const padding = story ? 88 : landscape ? 72 : 42;
  const borderWidth = story ? 9 : 6;
  const logoSize = story ? 34 : landscape ? 30 : 21;
  const labelSize = story ? 22 : 16;
  const headlineSize = story ? 72 : landscape ? 49 : 39;
  const signSize = story ? 40 : landscape ? 27 : 22;
  const footerSize = story ? 27 : landscape ? 21 : 17;
  const radius = story ? 64 : landscape ? 34 : 46;

  const tree = h('div', {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
    overflow: 'hidden',
    width,
    height,
    padding,
    border: `${borderWidth}px solid #F5C86A`,
    borderRadius: radius,
    color: '#ffffff',
    fontFamily: 'Bitter',
    background: 'linear-gradient(155deg, #3d092d 0%, #651044 52%, #8a1c5c 100%)',
  }, [
    h('div', { display: 'flex', flexDirection: 'column' }, [
      h('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, [
        h('div', { display: 'flex', fontSize: logoSize, fontWeight: 700, letterSpacing: story ? 10 : 6, color: '#F5C86A' }, 'MELOOHA'),
        h('div', {
          display: 'flex',
          fontSize: labelSize,
          letterSpacing: story ? 4 : 2,
          color: 'rgba(255,255,255,0.78)',
          border: '1px solid rgba(245,200,106,0.55)',
          borderRadius: 999,
          padding: story ? '12px 20px' : '7px 12px',
        }, 'CHART INSIGHT'),
      ]),
      h('div', {
        display: 'flex',
        width: '100%',
        height: 2,
        marginTop: story ? 30 : 22,
        background: 'rgba(245,200,106,0.52)',
      }),
    ]),
    h('div', {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      flexGrow: 1,
      paddingTop: story ? 70 : 34,
      paddingBottom: story ? 70 : 34,
    }, [
      h('div', {
        display: 'flex',
        fontSize: labelSize,
        letterSpacing: story ? 5 : 3,
        color: '#F5C86A',
        marginBottom: story ? 26 : 16,
      }, 'A NOTE FROM YOUR CHART'),
      h('div', {
        display: 'flex',
        fontSize: headlineSize,
        fontWeight: 700,
        lineHeight: 1.24,
        textWrap: 'balance',
      }, `“${o.headline}”`),
    ]),
    h('div', {
      display: 'flex',
      flexDirection: 'column',
      borderTop: '1px solid rgba(245,200,106,0.52)',
      paddingTop: story ? 34 : 22,
    }, [
      h('div', { display: 'flex', fontSize: signSize, color: '#F5C86A', lineHeight: 1.25 }, o.signLine),
      h('div', {
        display: 'flex',
        fontSize: footerSize,
        marginTop: story ? 20 : 12,
        opacity: 0.86,
      }, 'A thoughtful reading, grounded in your chart'),
    ]),
  ]);

  const svg = await satori(tree as any, { width, height, fonts });
  return new Resvg(svg).render().asPng();
}
