'use client'

import Image from "next/image";
import help from "../../../public/help.png";
import { useState } from "react";
import { useUserDispatch } from "../UserContext";
import { decode } from "jsonwebtoken";
import { useRouter } from 'next/navigation';

export default function Login() {
  const userDispatch = useUserDispatch();
  const router = useRouter();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const form = {
      name,
      password
    };

    console.log(form);

    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify(form)
    });

    const data = await response.json();

    console.log(data);

    if (data.success) {
      const userData = decode(data.jwt)

      userDispatch({
        type: 'login',
        payload: {
          token: data.jwt,
          ...userData
        }
      });

      router.replace('/');
    } else {
      setError('Wrong credentials');
    }
  }

  return (
    <div className="bg-violet-900">
      <div className="flex flex-col items-center justify-center bg-violet-900">
          <div className="flex items-center justify-center my-10 opacity-30">
            <Image src={help} width={200} height={200} alt=""></Image>
          </div>
          <form>
            <div className="w-96 p-6 py-10 rounded shadow-sm">
              <input
                className="w-full text-center rounded-2xl py-2 bg-mantis-600 text-mantis-50 placeholder:text-mantis-200 px-1 outline-none mb-6" type="name" placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="w-full text-center rounded-2xl py-2 bg-mantis-600 text-mantis-50 placeholder:text-mantis-200 px-1 outline outline-mantis-200 mb-4"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

            </div>
          </form>

        <span className="text-mahogany-600 mb-4">
          {error}
        </span>

        <button
          className="bg-mantis-700 text-white w-28 text-lg text-center rounded py-2 px-1 mb-8 hover:underline"
          onClick={handleSubmit}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
