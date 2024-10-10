export default (babel) => {
    const { types: t } = babel;

    /**
     * Создаем состояние и начинаем трансформировать код
     *
     * @param  {NodePath} path
     * @param  {Object} state
     */
    function visitProgram(path, plugin) {
        let {
            hocs = [
                'React.memo',
                'React.forwardRef'
            ],
            otherHOCs,
        } = plugin.opts;
        if (otherHOCs) {
            hocs = [ ...hocs, ...otherHOCs ];
        }

        const state = {
            hocs,
            memoizedFunctions: [],
            react: 'React',
            importSpecifiers: null,
        };
        const visitor = {
            FunctionDeclaration: visitFunctionDeclaration,
        };
        path.traverse(visitor, state);
    }

    /**
     * Ищем function declaration и мемоизируем их
     *
     * @param  {NodePath} path
     * @param  {Object} state
     */
    function visitFunctionDeclaration(path, state) {
        if (path.parent.type === 'ExportDefaultDeclaration') {
            // export default нужно обрабатывать иначе
            // потому что такой код как ниже не валидный
            //
            // export default const Component = ...
            return;
        }
        const func = path.node;
        const call = memoizeFunction(func, state);
        const cid = func.id;
        const constDecl = declareConstant(cid, call, state);
        path.replaceWith(constDecl);
    }

    /**
     * Создаем константу для присвоения ей мемоизированной функции
     *
     * @param  {Node} id
     * @param  {Node} init
     * @param  {Object} state
     *
     * @return {Node}
     */
    function declareConstant(id, init, state) {
        const varDecl = t.variableDeclarator(id, init);
        return t.variableDeclaration('const', [ varDecl ]);
    }

    /**
     * Оборачиваем функцию в React.memo()
     *
     * @param  {Node} path
     * @param  {Object} state
     *
     * @return {Node}
     */
    function memoizeFunction(func, state) {
        const { id, params, body } = func;
        const react = t.identifier(state.react);
        const memo = t.identifier('memo');
        const callee = t.memberExpression(react, memo);
        const expr = nameAnonymousFunction(id, params, body, false, false);
        state.memoizedFunctions.push(expr);
        return t.callExpression(callee, [ expr ]);
    }

    /**
     * Превращаем анонимную функцию в именованную
     *
     * @param  {Node} id
     * @param  {Node} arrowFunc
     * @param  {Object} state
     *
     * @return {Node}
     */
    function nameAnonymousFunction(id, params, body, generator, async) {
        return t.functionExpression(id, params, body, generator, async);
    }

    return {
        visitor: {
            Program: visitProgram
        }
    };
};
