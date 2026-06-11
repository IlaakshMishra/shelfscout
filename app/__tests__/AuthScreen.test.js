import { render, screen, userEvent } from '@testing-library/react-native';
import AuthScreen from '../src/screens/AuthScreen';
import { api } from '../src/api';

jest.mock('../src/api', () => ({
  api: jest.fn(async () => ({ token: 't', user: { role: 'reader' } })),
  setToken: jest.fn(),
}));
jest.useFakeTimers();

beforeEach(() => api.mockClear());

test('rejects short password client-side without calling the API', async () => {
  const user = userEvent.setup();
  render(<AuthScreen onAuthed={jest.fn()} />);
  await user.type(screen.getByPlaceholderText('Email'), 'a@b.com');
  await user.type(screen.getByPlaceholderText('Password (min 8 characters)'), 'short');
  await user.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Password must be at least 8 characters');
  expect(api).not.toHaveBeenCalled();
});

test('valid login calls API and onAuthed', async () => {
  const user = userEvent.setup();
  const onAuthed = jest.fn();
  render(<AuthScreen onAuthed={onAuthed} />);
  await user.type(screen.getByPlaceholderText('Email'), 'a@b.com');
  await user.type(screen.getByPlaceholderText('Password (min 8 characters)'), 'password123');
  await user.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(api).toHaveBeenCalledWith('/auth/login', {
    method: 'POST',
    body: { email: 'a@b.com', password: 'password123' },
  });
  expect(onAuthed).toHaveBeenCalledWith({ role: 'reader' });
});
