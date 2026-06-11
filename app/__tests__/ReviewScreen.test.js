import { render, screen, userEvent } from '@testing-library/react-native';
import ReviewScreen from '../src/screens/ReviewScreen';
import { api } from '../src/api';

jest.mock('../src/api', () => ({ api: jest.fn(async () => ({})) }));
jest.useFakeTimers();

const route = {
  params: {
    scanId: 7,
    mode: 'shelf',
    books: [
      { title: 'Dune', author: 'Frank Herbert' },
      { title: 'Crime and Pun1shment', author: '' },
    ],
  },
};

beforeEach(() => api.mockClear());

test('renders detected titles as editable, checked rows', () => {
  render(<ReviewScreen route={route} navigate={jest.fn()} />);
  expect(screen.getByDisplayValue('Dune')).toBeOnTheScreen();
  expect(screen.getByRole('checkbox', { name: 'Keep Dune' })).toBeChecked();
});

test('unchecking a book excludes it from the confirm payload', async () => {
  const user = userEvent.setup();
  render(<ReviewScreen route={route} navigate={jest.fn()} />);
  await user.press(screen.getByRole('checkbox', { name: 'Keep Crime and Pun1shment' }));
  await user.press(screen.getByRole('button', { name: 'Add 1 books to my library' }));
  expect(api).toHaveBeenCalledWith('/library/confirm', {
    method: 'POST',
    body: { scanId: 7, books: [{ title: 'Dune', author: 'Frank Herbert' }] },
  });
});

test('editing a typo sends the corrected title', async () => {
  const user = userEvent.setup();
  render(<ReviewScreen route={route} navigate={jest.fn()} />);
  const input = screen.getByDisplayValue('Crime and Pun1shment');
  await user.clear(input);
  await user.type(input, 'Crime and Punishment');
  await user.press(screen.getByRole('button', { name: 'Add 2 books to my library' }));
  const sent = api.mock.calls[0][1].body.books.map((b) => b.title);
  expect(sent).toContain('Crime and Punishment');
});

test('navigates to library after confirm', async () => {
  const user = userEvent.setup();
  const navigate = jest.fn();
  render(<ReviewScreen route={route} navigate={navigate} />);
  await user.press(screen.getByRole('button', { name: 'Add 2 books to my library' }));
  expect(navigate).toHaveBeenCalledWith('library');
});
