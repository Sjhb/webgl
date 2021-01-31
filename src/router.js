import Index from './pages/index';
import Circle from './pages/circle';
import ortProjection from './pages/ortProjection';
import perProjection from './pages/perProjection';
import light from './pages/light';
import cube from './pages/cube';
import pointLight from './pages/pointLight';
import jointModel from './pages/jointModel';
import mouseRotate from './pages/mouseRotate';
import pickModel from './pages/pickModel';

export default [
  {
    path: '/circle',
    component: Circle,
    title: '圆圈',
    children: [],
  },
  {
    path: '/ort',
    component: ortProjection,
    title: '正射投影',
    children: [],
  },
  {
    path: '/perspective',
    component: perProjection,
    title: '透视投影',
    children: [],
  },
  {
    path: '/cube',
    component: cube, 
    title: '立方体',
    children: [],
  },
  {
    path: '/light',
    component: light,
    title: '平行光',
    children: [],
  },
  {
    path: '/pointLight',
    component: pointLight,
    title: '点光源',
    children: [],
  },
  {
    path: '/jointModel',
    component: jointModel,
    title: '组合模型',
    children: [],
  },
  {
    path: '/mouseRotate',
    component: mouseRotate,
    title: '鼠标控制旋转',
    children: [],
  },
  {
    path: '/pickModel',
    component: pickModel,
    title: '选中物体',
    children: [],
  },
  {
    path: '/',
    component: Index,
    children: [],
  }
]