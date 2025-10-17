import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Button } from '../button';
import { DialogContent, DialogDescription, DialogRoot, DialogTitle, DialogTrigger } from '../dialog';

describe('Dialog', () => {
  it('opens and closes via trigger interactions', async () => {
    const user = userEvent.setup();
    render(
      <DialogRoot>
        <DialogTrigger>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Modal</DialogTitle>
          <DialogDescription>Content</DialogDescription>
        </DialogContent>
      </DialogRoot>
    );

    const [trigger] = screen.getAllByRole('button', { name: /open/i });
    await user.click(trigger);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
