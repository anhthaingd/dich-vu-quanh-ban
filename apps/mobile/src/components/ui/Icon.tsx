/* eslint-disable @typescript-eslint/no-require-imports -- Metro requires static local asset references. */
import { Image,View } from 'react-native';
import { theme } from '../../theme/tokens';
const sources = {
  search: require('../../../assets/icons/Search.png'),
  pin: require('../../../assets/icons/MapPin.png'),
  grid: require('../../../assets/icons/LayoutGrid.png'),
  navigation: require('../../../assets/icons/Navigation.png'),
  jobs: require('../../../assets/icons/Briefcase.png'),
  messages: require('../../../assets/icons/MessageCircle.png'),
  bell: require('../../../assets/icons/Bell.png'),
  map: require('../../../assets/icons/Map.png'),
  filters: require('../../../assets/icons/SlidersHorizontal.png'),
  down: require('../../../assets/icons/ChevronDown.png'),
  arrow: require('../../../assets/icons/ArrowUpRight.png'),
  wrench: require('../../../assets/icons/Wrench.png'),
  airVent: require('../../../assets/icons/AirVent.png'),
  sprayCan: require('../../../assets/icons/SprayCan.png'),
  laptop: require('../../../assets/icons/Laptop.png'),
  car: require('../../../assets/icons/Car.png'),
  pawPrint: require('../../../assets/icons/PawPrint.png'),
  scissors: require('../../../assets/icons/Scissors.png'),
  truck: require('../../../assets/icons/Truck.png'),
  washingMachine: require('../../../assets/icons/WashingMachine.png'),
  router: require('../../../assets/icons/Router.png'),
};
export type IconName = keyof typeof sources | 'wallet' | 'back';
export function Icon({ name, size = 21, color = theme.colors.muted }: { name: IconName; size?: number; color?: string }) {
  if(name==='back')return <View accessible={false} style={{width:size,height:size,justifyContent:'center'}}><View style={{height:2,width:size*0.75,backgroundColor:color,marginLeft:size*0.12}}/><View style={{position:'absolute',left:size*0.12,top:size*0.25,width:size*0.5,height:size*0.5,borderLeftWidth:2,borderBottomWidth:2,borderColor:color,transform:[{rotate:'45deg'}]}}/></View>;
  if(name==='wallet')return <View accessible={false} style={{width:size,height:size*0.8,borderWidth:1.7,borderColor:color,borderRadius:3,marginVertical:size*0.1}}><View style={{position:'absolute',right:-1,top:size*0.2,width:size*0.4,height:size*0.3,borderWidth:1.5,borderColor:color,borderRadius:2,backgroundColor:'#fff'}}/></View>;
  return <Image accessible={false} source={sources[name]} style={{width: size, height: size, tintColor: color}} />;
}
