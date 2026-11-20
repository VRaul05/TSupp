
import { test, expect, type Page } from '@playwright/test';

async function loginAndVerifyRole(
  page: Page,
  email: string | undefined,
  password: string | undefined,
  expectedRole: string
) {
  if (!email || !password) {
    throw new Error('Faltan las credenciales E2E.');
  }

  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);

  await page.getByRole('button', {
    name: 'Entrar a la consola',
  }).click();

  await expect(page).toHaveURL(/\/soporte\/tickets$/);

  const token = await page.evaluate(() =>
    sessionStorage.getItem('tsupp.support.jwt')
  );

  expect(token).toBeTruthy();

  if (!token) {
    throw new Error('No se encontró el token de autenticación.');
  }

  const response = await page.request.get(
    'http://127.0.0.1:8000/api/auth/me',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  expect(response.status()).toBe(200);

  const profile = await response.json();

  expect(profile.role).toBe(expectedRole);
}

test.describe('Portal de soporte TSupp', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/soporte/acceso');
  });

  test('debe mostrar la pantalla de acceso', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'PUGSTIC' })
    ).toBeVisible();

    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();

    await expect(
      page.getByRole('button', { name: 'Entrar a la consola' })
    ).toBeVisible();
  });

  test('debe impedir el envío del formulario vacío', async ({ page }) => {
    const email = page.locator('#email');

    await page.getByRole('button', {
      name: 'Entrar a la consola',
    }).click();

    await expect(email).toBeFocused();
    await expect(email).toHaveAttribute('required', '');
    await expect(page.locator('#password')).toHaveAttribute(
      'required',
      ''
    );
  });

  test('debe mostrar un error con credenciales incorrectas', async ({ page }) => {
    await page.locator('#email').fill('qa.invalido@tsupp.local');
    await page.locator('#password').fill('ClaveIncorrecta123!');

    await page.getByRole('button', {
      name: 'Entrar a la consola',
    }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(
      /incorrect|inválid|credencial|autentic/i
    );

    await expect(page).toHaveURL(/\/soporte\/acceso$/);
  });

  test('debe redirigir al acceso si no existe una sesión', async ({ page }) => {
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });

    await page.goto('/soporte/tickets');

    await expect(page).toHaveURL(/\/soporte\/acceso$/);

    await expect(
      page.getByRole('heading', { name: 'PUGSTIC' })
    ).toBeVisible();
  });

  test('debe iniciar sesión correctamente como agente', async ({ page }) => {
    await loginAndVerifyRole(
      page,
      process.env.E2E_AGENT_EMAIL,
      process.env.E2E_AGENT_PASSWORD,
      'agent'
    );
  });

  test('debe iniciar sesión correctamente como supervisor', async ({ page }) => {
    await loginAndVerifyRole(
      page,
      process.env.E2E_SUPERVISOR_EMAIL,
      process.env.E2E_SUPERVISOR_PASSWORD,
      'supervisor'
    );
  });
});
