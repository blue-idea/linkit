import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginScreen } from '../../components/LoginScreen';

describe('LoginScreen 认证分支', () => {
  // REQ-001-AC-006
  it('emailConfirmationRequired 时显示 Check your email', () => {
    render(
      <LoginScreen
        loading={false}
        error={null}
        emailConfirmationRequired
        onSignIn={vi.fn()}
        onSignUp={vi.fn()}
        onUseLocal={vi.fn()}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent('Check your email');
  });

  // REQ-001-AC-003
  it('显示英文错误提示', () => {
    render(
      <LoginScreen
        loading={false}
        error="Invalid login credentials"
        onSignIn={vi.fn()}
        onSignUp={vi.fn()}
        onUseLocal={vi.fn()}
      />
    );
    expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
  });
});
