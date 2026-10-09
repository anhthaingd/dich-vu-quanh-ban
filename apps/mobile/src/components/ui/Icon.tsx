/* eslint-disable @typescript-eslint/no-require-imports -- Metro requires static local asset references. */
import { Image } from 'react-native';
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
export type IconName = keyof typeof sources;
export function Icon({ name, size = 21, color = theme.colors.muted }: { name: IconName; size?: number; color?: string }) {
  return <Image accessible={false} source={sources[name]} style={{width: size, height: size, tintColor: color}} />;
}
