import { LineChart } from 'echarts/charts';
import {
  AriaComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

// SmartPricing uses gradient area/line charts. Load only the modules it renders.
// The engine stays behind provideZardCharts()' dynamic import.
echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  AriaComponent,
  SVGRenderer,
]);
export const zardEcharts = echarts;
