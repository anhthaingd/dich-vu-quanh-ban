import { fireEvent, render, screen } from '@testing-library/react-native';
import {SegmentedTabs} from './SegmentedTabs';
import { Button } from './Button';
import { Input } from './Input';

test('button exposes disabled and busy state and blocks actions while loading', () => {
  const onPress = jest.fn();
  const view = render(<Button label="Lưu" onPress={onPress} disabled />);
  fireEvent.press(screen.getByRole('button', { name: 'Lưu' }));
  expect(onPress).not.toHaveBeenCalled();
  view.rerender(<Button label="Lưu" onPress={onPress} loading />);
  expect(screen.getByRole('button', { name: 'Lưu', busy: true })).toBeDisabled();
  fireEvent.press(screen.getByRole('button', { name: 'Lưu' }));
  expect(onPress).not.toHaveBeenCalled();
  view.rerender(<Button label="Lưu" onPress={onPress} variant="secondary" />);
  fireEvent.press(screen.getByRole('button', { name: 'Lưu' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('input keeps its label visible and announces validation errors without losing text', () => {
  const onChangeText = jest.fn();
  const view = render(<Input label="Địa chỉ" value="Hà Nội" hint="Nhập địa chỉ" onChangeText={onChangeText} />);
  expect(screen.getByText('Địa chỉ')).toBeVisible();
  fireEvent.changeText(screen.getByLabelText('Địa chỉ'), 'Cầu Giấy');
  expect(onChangeText).toHaveBeenCalledWith('Cầu Giấy');
  view.rerender(<Input label="Địa chỉ" value="Hà Nội" error="Thiếu số nhà" onChangeText={onChangeText} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Thiếu số nhà');
  expect(screen.getByDisplayValue('Hà Nội')).toBeVisible();
});

test('compact tabs expose the selected choice and cannot trigger a disabled or already selected option',()=>{
 const changed=jest.fn();render(<SegmentedTabs value="all" onChange={changed} options={[{value:'all',label:'Tất cả'},{value:'unread',label:'Chưa đọc'},{value:'restricted',label:'Thiếu quyền',disabled:true}]}/>);
 expect(screen.getByRole('tab',{name:'Tất cả',selected:true})).toBeVisible();
 fireEvent.press(screen.getByRole('tab',{name:'Tất cả'}));fireEvent.press(screen.getByRole('tab',{name:'Thiếu quyền'}));expect(changed).not.toHaveBeenCalled();
 fireEvent.press(screen.getByRole('tab',{name:'Chưa đọc'}));expect(changed).toHaveBeenCalledWith('unread');
});
